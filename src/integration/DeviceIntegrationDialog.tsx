import { useState, type ComponentType } from 'react';
import {
  Alert, Box as MuiBox, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControlLabel, Grid, Paper, Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { CableOutlined, CheckCircleOutline, Close, LanOutlined, Refresh, SecurityOutlined, SettingsEthernetOutlined, SensorsOutlined, WarningAmberOutlined } from '@mui/icons-material';
import { ConnectionResult, DeviceSnapshots, IntegrationSettings, scalar } from './useDeviceIntegration';

// Same MUI 5 Box compatibility shim used by App.tsx; runtime stays unchanged.
const Box = MuiBox as ComponentType<any>;

type Props = {
  open: boolean;
  onClose: () => void;
  settings: IntegrationSettings;
  updateSettings: (settings: IntegrationSettings) => void;
  liveEnabled: boolean;
  setLiveEnabled: (enabled: boolean) => void;
  checking: boolean;
  testConnections: () => Promise<void>;
  wcs: ConnectionResult;
  wms: ConnectionResult;
  snapshots: DeviceSnapshots;
};
function HealthChip({ name, result }: { name: string; result: ConnectionResult }) {
  const color = result.status === 'online' ? '#138669' : result.status === 'offline' ? '#b84234' : '#657994';
  const bg = result.status === 'online' ? '#e9f8f0' : result.status === 'offline' ? '#ffefeb' : '#f1f4f8';
  return <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ p: 1.45, border: '1px solid #e4e9f0', borderRadius: 2 }}>
    <Box><Typography sx={{ fontWeight: 800, fontSize: 12.5 }}>{name}</Typography>
      <Typography sx={{ color: '#74869a', fontSize: 11 }}>{result.detail}</Typography></Box>
    <Chip size="small" label={result.status.toUpperCase()} sx={{ bgcolor: bg, color, fontSize: 10, fontWeight: 800 }} />
  </Stack>;
}
const codeStyle = { fontFamily: 'ui-monospace,Consolas,monospace', fontSize: 11.5, lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } as const;
export default function DeviceIntegrationDialog(props: Props) {
  const [tab, setTab] = useState(0);
  const [wcsPath, setWcsPath] = useState(props.settings.wcsPath);
  const [wmsPath, setWmsPath] = useState(props.settings.wmsPath);
  const [message, setMessage] = useState('');
  const dirty = wcsPath !== props.settings.wcsPath || wmsPath !== props.settings.wmsPath;
  const check = () => {
    if (dirty) { setMessage('Save the API paths first, then run the connection test.'); return; }
    setMessage(''); void props.testConnections();
  };
  const save = () => {
    if (!/^\/(?!\/)[a-zA-Z0-9/_-]+$/.test(wcsPath) || wcsPath.includes('..') || !/^\/(?!\/)[a-zA-Z0-9/_-]+$/.test(wmsPath) || wmsPath.includes('..')) {
      setMessage('Use same-origin paths such as /bridge/wcs and /bridge/wms. No full URLs or credentials here.'); return;
    }
    props.updateSettings({ wcsPath, wmsPath }); setMessage('Paths saved for this browser session. Run Test connections.');
  };
  const crane = props.snapshots.crane;
  return <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="md" scroll="paper" aria-labelledby="integration-title">
    <DialogTitle id="integration-title" sx={{ pb: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ bgcolor: '#fff0e9', color: '#ee5225', p: 1, borderRadius: 2, display: 'flex' }}><CableOutlined /></Box>
        <Box flex={1}><Typography fontWeight={900} fontSize={19}>Device Integration</Typography>
          <Typography fontSize={12} color="text.secondary">Connect the browser to your WMS/WCS gateway — read-only</Typography></Box>
        <Button size="small" onClick={props.onClose} startIcon={<Close />} sx={{ color: '#66758a' }}>Close</Button>
      </Stack>
    </DialogTitle>
    <Tabs value={tab} onChange={(_event, next: number) => setTab(next)} sx={{ px: 3, borderBottom: '1px solid #e5eaf0' }} variant="scrollable" scrollButtons="auto">
      <Tab label="Architecture" /><Tab label="Connections & telemetry" /><Tab label="PLC signal map" />
    </Tabs>
    <DialogContent dividers sx={{ bgcolor: '#fbfcfe', minHeight: 355 }}>
      {tab === 0 && <Stack spacing={2.2}>
        <Alert severity="info" sx={{ fontSize: 12 }}>This UI currently runs a mock 3D simulation. Device Integration can <b>read real API feedback</b>, but never commands machinery. The 3D model and AGV/forklift routes remain demo data until mapping and telemetry adapters are developed.</Alert>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems="stretch">
          {[{ name: 'WMS', subtitle: 'Inventory / tasks', port: '8081' }, { name: 'WCS Gateway', subtitle: 'Validated equipment feedback', port: '8080' }, { name: 'PLC / Machine', subtitle: 'OPC UA / real controller', port: 'industrial LAN' }].map((a, i) =>
            <Paper key={a.name} variant="outlined" sx={{ flex: 1, p: 2, borderRadius: 2.5, minWidth: 0 }}>
              <Stack spacing={0.6}>
                <Typography fontSize={10} fontWeight={800} color="#ee5c31">LAYER {i + 1}</Typography>
                <Typography fontSize={14} fontWeight={800}>{a.name}</Typography>
                <Typography fontSize={11} color="text.secondary">{a.subtitle}</Typography>
                <Chip variant="outlined" size="small" label={a.port} sx={{ width: 'fit-content', mt: 0.3, fontSize: 10 }} />
              </Stack>
            </Paper>)}
        </Stack>
        <Typography variant="body2" color="text.secondary">The browser talks to the WMS and WCS through an HTTP reverse proxy. The WCS, not the browser, connects to an OPC UA server and remains responsible for command authorization, acknowledgments, timeouts and verified completion.</Typography>
        <Alert icon={<SecurityOutlined />} severity="warning" sx={{ fontSize: 12 }}><b>Never expose an OPC UA server or direct PLC write endpoint to the public browser.</b> Use a secured gateway, authenticated users and independently engineered machine-safety controls for physical equipment.</Alert>
      </Stack>}
      {tab === 1 && <Stack spacing={2.2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" fullWidth label="WCS API path" value={wcsPath} onChange={e => setWcsPath(e.target.value)} helperText="Vite proxy → http://127.0.0.1:8080" />
          <TextField size="small" fullWidth label="WMS API path" value={wmsPath} onChange={e => setWmsPath(e.target.value)} helperText="Vite proxy → http://127.0.0.1:8081" />
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button onClick={save} variant="outlined" size="small" disabled={!dirty}>Save paths</Button>
          <Button variant="contained" onClick={check} disabled={props.checking || dirty} size="small" startIcon={<Refresh />}>{props.checking ? 'Checking...' : 'Test connections'}</Button>
        </Stack>
        {message && <Alert severity={message.startsWith('Paths saved') ? 'success' : 'warning'}>{message}</Alert>}
        <Stack spacing={1}>
          <HealthChip name="WCS · crane status + tasks" result={props.wcs} />
          <HealthChip name="WMS · confirmed inventory" result={props.wms} />
        </Stack>
        <FormControlLabel control={<Switch checked={props.liveEnabled} onChange={e => props.setLiveEnabled(e.target.checked)} color="primary" />} label={<Box><Typography sx={{ fontWeight: 800, fontSize: 12.5 }}>Enable live read-only monitoring</Typography><Typography sx={{ color: '#8796a8', fontSize: 11 }}>Poll the APIs every 3 seconds. This does not control the PLC or replace the mock 3D animation.</Typography></Box>} />
        <Grid container spacing={1.4}>
          <Grid item xs={6} sm={3}><Paper variant="outlined" sx={{ p: 1.5 }}><Typography fontSize={11} color="text.secondary">Machine state</Typography><Typography fontWeight={800} fontSize={13}>{scalar(crane?.MachineState)}</Typography></Paper></Grid>
          <Grid item xs={6} sm={3}><Paper variant="outlined" sx={{ p: 1.5 }}><Typography fontSize={11} color="text.secondary">X position</Typography><Typography fontWeight={800} fontSize={13}>{scalar(crane?.AxisXPositionMm)} mm</Typography></Paper></Grid>
          <Grid item xs={6} sm={3}><Paper variant="outlined" sx={{ p: 1.5 }}><Typography fontSize={11} color="text.secondary">Z position</Typography><Typography fontWeight={800} fontSize={13}>{scalar(crane?.AxisZPositionMm)} mm</Typography></Paper></Grid>
          <Grid item xs={6} sm={3}><Paper variant="outlined" sx={{ p: 1.5 }}><Typography fontSize={11} color="text.secondary">Confirmed pallets</Typography><Typography fontWeight={800} fontSize={13}>{props.snapshots.inventory?.length ?? '—'}</Typography></Paper></Grid>
        </Grid>
        <Typography sx={{ fontWeight: 800, fontSize: 12 }}>Latest WCS JSON response</Typography>
        <Box component="pre" sx={{ ...codeStyle, m: 0, p: 1.8, bgcolor: '#172b42', color: '#d9f2fd', borderRadius: 2, maxHeight: 175, overflow: 'auto' }}>{crane ? JSON.stringify(crane, null, 2) : 'No data yet. Start WCS and click Test connections.'}</Box>
        <Typography fontSize={11} color="text.secondary">WCS tasks: {props.snapshots.tasks?.length ?? '—'} · Last successful update: {props.snapshots.updatedAt ? new Date(props.snapshots.updatedAt).toLocaleTimeString() : '—'}</Typography>
      </Stack>}
      {tab === 2 && <Stack spacing={2}>
        <Alert severity="info">Example mapping based on the current virtual PLC simulator. A real controller will have a manufacturer-defined tag namespace and units.</Alert>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, '& th, & td': { borderBottom: '1px solid #e4e9f1', p: 1.3, textAlign: 'left' }, '& th': { bgcolor: '#f0f4f8' } }}>
            <thead><tr><th>PLC/WCS tag</th><th>Direction</th><th>Meaning</th></tr></thead>
            <tbody>
              {[
                ['TargetLocation','WCS → PLC','Requested rack or outbound location'],
                ['CommandOperation','WCS → PLC','PUTAWAY or RETRIEVAL'],
                ['CommandId','WCS → PLC','Unique command number; execute only once'],
                ['AcceptedCommandId','PLC → WCS','Matching command acknowledged'],
                ['MachineState','PLC → WCS','Machine readiness, execution, completion, faults'],
                ['AxisXPositionMm','PLC → WCS','Measured/simulated aisle travel position in mm'],
                ['AxisZPositionMm','PLC → WCS','Measured/simulated vertical lift in mm'],
                ['CompletedCommandId','PLC → WCS','Completed command matching WCS task'],
                ['FaultCode','PLC → WCS','Device faults and failure states'],
              ].map(([tag, direction, meaning]) => <tr key={tag}><td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tag}</td><td>{direction}</td><td>{meaning}</td></tr>)}
            </tbody>
          </Box>
        </Box>
        <Alert icon={<WarningAmberOutlined />} severity="warning">A successful OPC UA write does <b>not</b> mean the move is finished. Your WCS must match the acknowledged and completed command IDs and validate final equipment feedback.</Alert>
      </Stack>}
    </DialogContent>
    <DialogActions sx={{ px: 3, py: 1.7 }}><Typography sx={{ mr: 'auto', fontSize: 11, color: '#8c9aa9' }}>WM Warehouse · Integration preview v1</Typography><Button onClick={props.onClose}>Done</Button></DialogActions>
  </Dialog>;
}
