import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Browser side is READ-ONLY. All API calls use GET. Industrial OPC UA and
 * authenticated device access must terminate at a separately secured WCS gateway.
 * URLs are limited to same-origin paths; Vite proxies them during development.
 */
export type Health = 'not-checked' | 'checking' | 'online' | 'offline';
export type ConnectionResult = { status: Health; detail: string };
export type IntegrationSettings = { wcsPath: string; wmsPath: string };
export type JsonRecord = Record<string, unknown>;
export type DeviceSnapshots = {
  crane: JsonRecord | null;
  tasks: JsonRecord[] | null;
  inventory: JsonRecord[] | null;
  updatedAt: string | null;
};
export const DEFAULT_SETTINGS: IntegrationSettings = {
  wcsPath: '/bridge/wcs',
  wmsPath: '/bridge/wms',
};

function sameOriginPath(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!/^\/[a-zA-Z0-9/_-]+$/.test(trimmed) || trimmed.startsWith('//') || trimmed.includes('..')) {
    throw new Error('Use a same-origin API path, for example /bridge/wcs. Configure its backend target in .env.');
  }
  return trimmed;
}

async function getJson(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(path, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', credentials: 'same-origin', signal });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  return response.json();
}

function record(value: unknown): JsonRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
}
function recordArray(value: unknown): JsonRecord[] | null {
  return Array.isArray(value) ? value.filter(x => !!record(x)) as JsonRecord[] : null;
}

export function useDeviceIntegration() {
  const [settings, setSettings] = useState<IntegrationSettings>(DEFAULT_SETTINGS);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [checking, setChecking] = useState(false);
  const [wcs, setWcs] = useState<ConnectionResult>({ status: 'not-checked', detail: 'Not checked' });
  const [wms, setWms] = useState<ConnectionResult>({ status: 'not-checked', detail: 'Not checked' });
  const [snapshots, setSnapshots] = useState<DeviceSnapshots>({ crane: null, tasks: null, inventory: null, updatedAt: null });
  const pending = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  const testConnections = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setChecking(true);
    setWcs(s => ({ ...s, status: 'checking' }));
    setWms(s => ({ ...s, status: 'checking' }));
    const ctrl = new AbortController();
    controller.current = ctrl;
    const timeout = window.setTimeout(() => ctrl.abort(), 6500);
    const current = settingsRef.current;
    // Separate requests prevent a WMS outage from suppressing valid crane feedback.
    const readWcs = async () => {
      try {
        const base = sameOriginPath(current.wcsPath);
        const craneValue = await getJson(`${base}/api/crane/status`, ctrl.signal);
        const crane = record(craneValue);
        if (!crane) throw new Error('Crane status was not a JSON object');
        if (mounted.current) {
          setWcs({ status: 'online', detail: 'GET /api/crane/status · OK' });
          setSnapshots(s => ({ ...s, crane, updatedAt: new Date().toISOString() }));
        }
        // Task history is optional: preserve valid telemetry even if this route is unavailable.
        try {
          const tasks = recordArray(await getJson(`${base}/api/tasks`, ctrl.signal));
          if (mounted.current && tasks) setSnapshots(s => ({ ...s, tasks }));
        } catch { if (mounted.current) setSnapshots(s => ({ ...s, tasks: null })); }
      } catch (error) {
        if (mounted.current) {
          setWcs({ status: 'offline', detail: error instanceof Error ? error.message : 'Connection failed' });
          setSnapshots(s => ({ ...s, crane: null, tasks: null }));
        }
      }
    };
    const readWms = async () => {
      try {
        const base = sameOriginPath(current.wmsPath);
        const value = await getJson(`${base}/api/wms/inventory`, ctrl.signal);
        const inventory = recordArray(value);
        if (!inventory) throw new Error('WMS inventory was not a JSON array');
        if (mounted.current) {
          setWms({ status: 'online', detail: 'GET /api/wms/inventory · OK' });
          setSnapshots(s => ({ ...s, inventory, updatedAt: new Date().toISOString() }));
        }
      } catch (error) {
        if (mounted.current) {
          setWms({ status: 'offline', detail: error instanceof Error ? error.message : 'Connection failed' });
          setSnapshots(s => ({ ...s, inventory: null }));
        }
      }
    };
    try { await Promise.all([readWcs(), readWms()]); }
    finally {
      window.clearTimeout(timeout);
      controller.current = null;
      pending.current = false;
      if (mounted.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!liveEnabled) return;
    void testConnections();
    const timer = window.setInterval(() => { void testConnections(); }, 3000);
    return () => window.clearInterval(timer);
  }, [liveEnabled, testConnections]);

  const updateSettings = useCallback((next: IntegrationSettings) => {
    setLiveEnabled(false);  // no background polling from stale or unverified URL
    setSettings(next);
    settingsRef.current = next;
    setWcs({ status: 'not-checked', detail: 'Check connection after changing URL' });
    setWms({ status: 'not-checked', detail: 'Check connection after changing URL' });
    setSnapshots({ crane: null, tasks: null, inventory: null, updatedAt: null });
  }, []);

  return { settings, updateSettings, liveEnabled, setLiveEnabled, checking, testConnections, wcs, wms, snapshots };
}

export function scalar(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
