import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert, Box, Button, Chip, Divider, Drawer, FormControl, IconButton, InputLabel,
  LinearProgress, MenuItem, Paper, Select, Snackbar, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Tooltip,
  Typography, useMediaQuery,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AddCircleOutline, AnalyticsOutlined, Architecture, ArrowForwardIos,
  CheckCircleOutline, DashboardCustomize, DownloadOutlined, FilterAltOutlined,
  GridView, Inventory2Outlined, LocalShippingOutlined, Menu as MenuIcon, Pause,
  PlayArrow, PrecisionManufacturingOutlined, RestartAlt, RouteOutlined, SensorsOutlined,
  SettingsSuggestOutlined, ViewInArOutlined, WarehouseOutlined, CableOutlined,
} from '@mui/icons-material';
import WarehouseScene, { type CameraView } from './components/WarehouseScene';
import DeviceIntegrationDialog from './integration/DeviceIntegrationDialog';
import { useDeviceIntegration, scalar } from './integration/useDeviceIntegration';
import {
  SLOTS, SLOT_BY_ID, TOTAL_SLOTS, activeTask, advanceSimulation, createTask,
  initialSimulation, type Operation, type SimulationState, type WarehouseTask,
} from './simulation/model';

const panelSx = { border: '1px solid #e4eaf2', borderRadius: '15px', overflow: 'hidden', bgcolor: '#fff' } as const;
const monoSx = { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '0.76rem' } as const;
const navLinks = [
  { label: 'Overview', icon: <DashboardCustomize fontSize="small" />, href: '#overview' },
  { label: '3D Warehouse', icon: <ViewInArOutlined fontSize="small" />, href: '#warehouse' },
  { label: 'Rack inventory', icon: <Inventory2Outlined fontSize="small" />, href: '#inventory' },
  { label: 'Task timeline', icon: <RouteOutlined fontSize="small" />, href: '#tasks' },
  { label: 'Equipment', icon: <LocalShippingOutlined fontSize="small" />, href: '#equipment' },
];

function SideNavigation({ close, openIntegration }: { close?: () => void; openIntegration: () => void }) {
  return <Box sx={{ width: 226, minHeight: '100%', bgcolor: '#12253d', color: '#d1e2f4', px: 2.1, py: 3 }}>
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 5, px: 0.5 }}>
      <Box component="img" src="/wm-fox-logo.png" alt="WM Warehouse fox logo" sx={{ width: 44, height: 44, objectFit: 'contain', bgcolor: '#fff', borderRadius: 2.1, p: 0.35 }} />
      <Box><Typography sx={{ fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.2 }}>WM Warehouse</Typography>
        <Typography sx={{ fontSize: 10.5, color: '#8eabc8', mt: 0.2, letterSpacing: '0.09em' }}>3D DIGITAL TWIN</Typography></Box>
    </Stack>
    <Typography sx={{ color: '#6687a8', letterSpacing: '0.12em', px: 1.5, fontSize: 10, fontWeight: 800, mb: 1.5 }}>WORKSPACE</Typography>
    <Stack spacing={0.65}>
      {navLinks.map((n, i) => <Box key={n.label} component="a" href={n.href} onClick={close} sx={{
        color: i === 1 ? '#fff' : '#adbed0', textDecoration: 'none', px: 1.5, py: 1.45,
        borderRadius: 2.2, bgcolor: i === 1 ? '#245079' : 'transparent', display: 'flex', alignItems: 'center', gap: 1.6,
        fontSize: '0.81rem', fontWeight: i === 1 ? 800 : 600,
        '&:hover': { bgcolor: '#264563', color: '#fff' },
      }}>{n.icon}{n.label}</Box>)}
    </Stack>
    <Box component="button" type="button" onClick={() => { close?.(); openIntegration(); }} sx={{ mt: 2, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 1.5, py: 1.4, px: 1.4, bgcolor: '#482d27', color: '#fff', borderRadius: 2, border: '1px solid #995344', cursor: 'pointer', fontSize: 12, fontWeight: 800, '&:hover': { bgcolor: '#68382d' } }}>
      <CableOutlined fontSize="small" /> Device Integration
    </Box>
    <Box sx={{ mt: 4, p: 1.8, border: '1px solid #2a4764', borderRadius: 2.5, bgcolor: '#172e49' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Box sx={{ height: 7, width: 7, borderRadius: '50%', bgcolor: '#42dbc0' }} />
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#e7f2ff' }}>MOCK SIMULATION</Typography>
      </Stack>
      <Typography sx={{ fontSize: 11.5, color: '#9cb5d0', lineHeight: 1.55 }}>All vehicle positions, tasks and rack inventory are generated in this browser.</Typography>
    </Box>
    <Typography sx={{ fontSize: 10.5, color: '#597b9e', mt: 3, px: 1 }}>MOCK BUILD 1.2.0</Typography>
  </Box>;
}

function Kpi({ label, value, suffix, icon, color, secondary }: {
  label: string; value: string | number; suffix: string; icon: ReactNode; color: string; secondary: string;
}) {
  return <Paper sx={{ ...panelSx, p: { xs: 2, md: 2.4 }, flex: '1 1 205px', minWidth: 0 }}>
    <Stack direction="row" alignItems="start" justifyContent="space-between">
      <Box><Typography sx={{ color: '#78889c', fontSize: 12, fontWeight: 700 }}>{label}</Typography>
        <Stack direction="row" alignItems="baseline" spacing={0.6} sx={{ mt: 1.1 }}>
          <Typography variant="h4" sx={{ color: '#162c46', fontSize: { xs: 26, md: 31 }, lineHeight: 1.1 }}>{value}</Typography>
          <Typography sx={{ color: '#8b9aab', fontSize: 12 }}>{suffix}</Typography>
        </Stack></Box>
      <Box sx={{ p: 1.1, bgcolor: alpha(color, 0.10), borderRadius: 2, color, display: 'flex' }}>{icon}</Box>
    </Stack>
    <Typography sx={{ mt: 1.25, color: '#98a7b7', fontSize: 11 }}>{secondary}</Typography>
  </Paper>;
}

function FleetRow({ icon, name, id, detail, color, status }: {
  icon: ReactNode; name: string; id: string; detail: string; color: string; status: string;
}) {
  return <Stack direction="row" spacing={1.6} alignItems="center" sx={{ py: 1.35 }}>
    <Box sx={{ width: 35, height: 35, bgcolor: alpha(color, 0.1), color, borderRadius: 2, display: 'grid', placeItems: 'center' }}>{icon}</Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{name} <Box component="span" sx={{ color: '#a3afbe', fontSize: 10, ml: 0.4 }}>{id}</Box></Typography>
      <Typography sx={{ fontSize: 11, color: '#8a9bab', mt: 0.18 }}>{detail}</Typography>
    </Box>
    <Chip label={status} size="small" sx={{ height: 22, bgcolor: '#e9f8f3', color: '#16816c', fontSize: 10, fontWeight: 800 }} />
  </Stack>;
}

function TaskRow({ task }: { task: WarehouseTask }) {
  const completed = task.status === 'COMPLETED';
  return <TableRow hover>
    <TableCell sx={{ ...monoSx, fontWeight: 700, whiteSpace: 'nowrap' }}>{task.id}</TableCell>
    <TableCell><Chip size="small" label={task.operation === 'PUTAWAY' ? 'Putaway' : 'Retrieval'} sx={{
      bgcolor: task.operation === 'PUTAWAY' ? '#e9f2ff' : '#fcf0e5',
      color: task.operation === 'PUTAWAY' ? '#2766bb' : '#b66d21', fontSize: 10.5,
    }} /></TableCell>
    <TableCell sx={monoSx}>{task.slotId}</TableCell>
    <TableCell sx={{ minWidth: 170 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: completed ? '#21987d' : '#69798c' }}>{task.phase}</Typography>
      {!completed && <LinearProgress variant="determinate" value={task.progress} sx={{ mt: 0.7, height: 4, borderRadius: 4 }} />}
    </TableCell>
    <TableCell><Chip size="small" variant="outlined" label={task.status} sx={{ fontSize: 10, height: 24,
      color: completed ? '#198b78' : task.status === 'RUNNING' ? '#2d6dc6' : '#718098',
      borderColor: completed ? '#b0e3cf' : task.status === 'RUNNING' ? '#a8c9f4' : '#d7e0ea' }} /></TableCell>
  </TableRow>;
}

function snapshotDownload(state: SimulationState) {
  const payload = {
    kind: 'MOCK_SIMULATION_ONLY', exportedAt: new Date().toISOString(), simulatedSeconds: Number(state.time.toFixed(1)),
    rackLocations: TOTAL_SLOTS, inventory: state.inventory, tasks: state.tasks, fleet: {
      crane: state.crane, forklift: state.forklift, agvs: state.agvs,
    }, events: state.events,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'asrs-mock-snapshot.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [sim, setSim] = useState<SimulationState>(initialSimulation);
  const [selectedSlotId, setSelectedSlotId] = useState('A-04-02');
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [cameraView, setCameraView] = useState<CameraView>('overview');
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState('');
  const [integrationOpen, setIntegrationOpen] = useState(false);
  const device = useDeviceIntegration();
  const small = useMediaQuery('(max-width:950px)');

  useEffect(() => {
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const realSeconds = Math.min((now - last) / 1000, 0.12);
      last = now;
      setSim(s => advanceSimulation(s, realSeconds));
    }, 55);
    return () => window.clearInterval(timer);
  }, []);

  const occupied = sim.inventory.length;
  const active = activeTask(sim);
  const completedCount = sim.tasks.filter(t => t.status === 'COMPLETED').length;
  const slot = SLOT_BY_ID[selectedSlotId];
  const pallet = sim.inventory.find(p => p.slotId === selectedSlotId);
  const slotReserved = sim.tasks.some(t => t.slotId === selectedSlotId && t.status !== 'COMPLETED');
  const emptySlots = useMemo(() => SLOTS.filter(s => !sim.inventory.some(p => p.slotId === s.id)), [sim.inventory]);
  const activeCount = sim.tasks.filter(t => t.status !== 'COMPLETED').length;

  const queue = (operation: Operation) => {
    try {
      setSim(s => createTask(s, operation, selectedSlotId));
      setNotice(`${operation} task queued for ${selectedSlotId}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to create demo task'); }
  };
  const createSamplePutaway = () => {
    const next = emptySlots.find(s => !sim.tasks.some(t => t.status !== 'COMPLETED' && t.slotId === s.id));
    if (!next) { setNotice('No available locations for a new task.'); return; }
    setSelectedSlotId(next.id);
    try { setSim(s => createTask(s, 'PUTAWAY', next.id)); setNotice(`Putaway queued at ${next.id}`); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'Unable to queue task'); }
  };

  return <Box sx={{ display: 'flex', minHeight: '100vh' }}>
    {!small && <Box component="aside" sx={{ flex: '0 0 226px' }}><SideNavigation openIntegration={() => setIntegrationOpen(true)} /></Box>}
    <Drawer open={small && mobileNav} onClose={() => setMobileNav(false)}>
      <SideNavigation close={() => setMobileNav(false)} openIntegration={() => setIntegrationOpen(true)} />
    </Drawer>

    <Box component="main" sx={{ flex: 1, minWidth: 0, px: { xs: 2, sm: 3, xl: 4 }, py: { xs: 2, md: 3 }, maxWidth: 1900, mx: 'auto' }}>
      <Stack id="overview" direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {small && <IconButton onClick={() => setMobileNav(true)}><MenuIcon /></IconButton>}
          <Box><Typography sx={{ color: '#8291a3', fontSize: 12, fontWeight: 700, letterSpacing: '0.025em' }}>WAREHOUSE OPERATIONS <Box component="span" sx={{ mx: 0.6 }}> / </Box> DIGITAL TWIN</Typography>
            <Typography variant="h5" sx={{ mt: 0.55 }}>WM Warehouse · 3D Overview</Typography></Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label="MOCK 3D SCENE" size="small" sx={{ bgcolor: '#fff0e6', color: '#ba502f', fontSize: 10, height: 28, border: '1px solid #f4d1be' }} />
          <Chip size="small" label={device.liveEnabled ? `Live API monitoring · ${device.wcs.status}` : 'Live API monitoring off'} sx={{ bgcolor: device.liveEnabled ? '#e9f8f1' : '#f0f3f7', color: device.liveEnabled ? '#177b63' : '#7c8b9b', height: 28, fontSize: 10 }} />
          <Button size="small" variant="contained" startIcon={<CableOutlined />} onClick={() => setIntegrationOpen(true)} sx={{ bgcolor: '#ee5a2d', '&:hover': { bgcolor: '#d84b24' } }}>Device Integration</Button>
          <Chip icon={<span style={{ width: 6, height: 6, borderRadius: '50%', background: sim.running ? '#26cda3' : '#e9aa52', display: 'inline-block' }} />}
            label={sim.running ? 'Simulation running' : 'Simulation paused'} size="small" sx={{ bgcolor: '#e9f7f5', color: '#22877a', height: 28, fontSize: 11 }} />
          <Button size="small" variant="outlined" startIcon={<DownloadOutlined />} onClick={() => snapshotDownload(sim)} sx={{ borderColor: '#dce4ee', color: '#3b5876' }}>Export JSON</Button>
        </Stack>
      </Stack>

      {device.liveEnabled && <Paper variant="outlined" sx={{ mb: 2, py: 1.4, px: 2, borderColor: '#d4e6dc', bgcolor: '#f8fcf9', borderRadius: 2.3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
          <Box><Typography sx={{ fontSize: 12.5, fontWeight: 900, color: '#177c63' }}>Live WCS/PLC feedback (read-only)</Typography>
          <Typography sx={{ fontSize: 11, color: '#658777' }}>Separate from the mock 3D scene · Last updated: {device.snapshots.updatedAt ? new Date(device.snapshots.updatedAt).toLocaleTimeString() : '—'}</Typography></Box>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontSize: 11.5 }}>State <b>{scalar(device.snapshots.crane?.MachineState)}</b></Typography>
            <Typography sx={{ fontSize: 11.5 }}>X <b>{scalar(device.snapshots.crane?.AxisXPositionMm)} mm</b></Typography>
            <Typography sx={{ fontSize: 11.5 }}>Z <b>{scalar(device.snapshots.crane?.AxisZPositionMm)} mm</b></Typography>
            <Typography sx={{ fontSize: 11.5 }}>WMS stock <b>{device.snapshots.inventory?.length ?? '—'}</b></Typography>
          </Stack>
        </Stack>
      </Paper>}
      <Stack direction="row" flexWrap="wrap" useFlexGap gap={1.7} sx={{ mb: 2.4 }}>
        <Kpi label="Stored pallets" value={occupied} suffix={`/ ${TOTAL_SLOTS}`} icon={<Inventory2Outlined />} color="#2366df" secondary="Confirmed mock inventory" />
        <Kpi label="Rack occupancy" value={`${Math.round(100 * occupied / TOTAL_SLOTS)}%`} suffix="utilized" icon={<GridView />} color="#8855d0" secondary={`${TOTAL_SLOTS - occupied} free locations`} />
        <Kpi label="Tasks in progress" value={activeCount} suffix="queued / running" icon={<RouteOutlined />} color="#e49d2f" secondary={active ? active.phase : 'Equipment ready for demo task'} />
        <Kpi label="Completed moves" value={completedCount} suffix="this session" icon={<CheckCircleOutline />} color="#19a286" secondary="Mock PLC completion simulated" />
      </Stack>

      <Box id="warehouse" sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'minmax(0,1fr) 310px' }, alignItems: 'stretch' }}>
        <Paper sx={{ ...panelSx, minWidth: 0 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} justifyContent="space-between" alignItems={{ xs: 'start', md: 'center' }} sx={{ p: 2, borderBottom: '1px solid #e6ecf2' }}>
            <Box><Stack direction="row" spacing={1} alignItems="center">
              <ViewInArOutlined sx={{ color: '#2468e4', fontSize: 20 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 800 }}>Warehouse 3D Map</Typography>
              <Chip label="DC-01" size="small" sx={{ height: 20, bgcolor: '#edf2f8', color: '#647892', fontSize: 9 }} />
            </Stack><Typography sx={{ color: '#8e9cac', fontSize: 11.5, mt: 0.5 }}>Drag to orbit · Scroll to zoom · Click a rack location</Typography></Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <ToggleButtonGroup size="small" exclusive value={cameraView} onChange={(_e, value: CameraView | null) => { if (value) setCameraView(value); }}>
                <ToggleButton value="overview" sx={{ px: 1.25, fontSize: 11, textTransform: 'none' }}>Overview</ToggleButton>
                <ToggleButton value="aisle" sx={{ px: 1.25, fontSize: 11, textTransform: 'none' }}>Aisle</ToggleButton>
                <ToggleButton value="top" sx={{ px: 1.25, fontSize: 11, textTransform: 'none' }}>Top</ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title="Reset mock simulation and inventory"><IconButton size="small" onClick={() => { setSim(initialSimulation()); setNotice('Demo reset to its initial mock state.'); }}><RestartAlt fontSize="small" /></IconButton></Tooltip>
            </Stack>
          </Stack>
          <Box sx={{ position: 'relative', height: { xs: 420, md: 560 }, bgcolor: '#eaf0f5' }}>
            <WarehouseScene simulation={sim} selectedSlotId={selectedSlotId} onSelectSlot={setSelectedSlotId} onHoverSlot={setHoveredSlot} cameraView={cameraView} />
            <Box sx={{ position: 'absolute', top: 14, left: 14, pointerEvents: 'none', bgcolor: 'rgba(255,255,255,.93)', backdropFilter: 'blur(5px)', border: '1px solid #dce5ed', borderRadius: 2, px: 1.5, py: 0.9 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 11.5, color: '#244663' }}>LOCAL MOCK SCENE</Typography>
              <Typography sx={{ ...monoSx, color: '#8495a6', mt: 0.25 }}>SIM T+{sim.time.toFixed(1)}s · {sim.speed}x</Typography>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 15, left: 15, right: 15, display: 'flex', gap: 1, justifyContent: 'space-between', pointerEvents: 'none' }}>
              <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(255,255,255,.94)', border: '1px solid #dfe7ef', maxWidth: '70%' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#31516d' }}>{hoveredSlot ?? `Selected · ${selectedSlotId}`}</Typography>
                <Typography sx={{ fontSize: 10, color: '#8796a7' }}>Blue outline marks selected rack</Typography>
              </Box>
              <Box sx={{ px: 1.25, py: 1.1, bgcolor: 'rgba(20,41,62,.87)', color: '#fff', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, height: 'fit-content', alignSelf: 'end' }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#55dbb5' }} />
                <Typography sx={{ fontSize: 10.2, fontWeight: 700 }}>2 AGVs · 1 forklift · 1 crane</Typography>
              </Box>
            </Box>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} sx={{ px: 2, py: 1.55, borderTop: '1px solid #e6ecf2' }}>
            <Stack direction="row" alignItems="center" spacing={2.2} flexWrap="wrap" useFlexGap>
              {[
                { name: 'Stored pallet', color: '#4aa9dc' },
                { name: 'Rack structure', color: '#e0a445' },
                { name: 'AGVs', color: '#37b5b7' },
                { name: 'Selected slot', color: '#2868e2' },
              ].map(v => <Stack direction="row" alignItems="center" spacing={0.6} key={v.name}>
                <Box sx={{ width: 8, height: 8, bgcolor: v.color, borderRadius: v.name === 'Selected slot' ? 0 : '50%' }} />
                <Typography sx={{ fontSize: 10.5, color: '#7c8da1' }}>{v.name}</Typography>
              </Stack>)}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Button size="small" variant="outlined" startIcon={sim.running ? <Pause /> : <PlayArrow />} onClick={() => setSim(s => ({ ...s, running: !s.running }))} sx={{ py: 0.35, borderColor: '#dce5ef' }}>{sim.running ? 'Pause' : 'Play'}</Button>
              <FormControl size="small" sx={{ minWidth: 73 }}><Select aria-label="Simulation speed" value={sim.speed} onChange={e => setSim(s => ({ ...s, speed: Number(e.target.value) }))} sx={{ height: 31, fontSize: 11.5 }}>
                {[1, 2, 4].map(n => <MenuItem value={n} key={n}>{n}x</MenuItem>)}
              </Select></FormControl>
            </Stack>
          </Stack>
        </Paper>

        <Stack spacing={2} minWidth={0}>
          <Paper sx={{ ...panelSx, p: 2.2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}><GridView sx={{ color: '#226adf', fontSize: 19 }} /><Typography sx={{ fontSize: 15, fontWeight: 800 }}>Rack Inspector</Typography></Stack>
            <Typography sx={{ color: '#8d9aac', fontSize: 11.5, mb: 1.5 }}>Select a rack directly in 3D or use this list.</Typography>
            <FormControl size="small" fullWidth>
              <InputLabel id="rack-location-label">Rack location</InputLabel>
              <Select labelId="rack-location-label" label="Rack location" value={selectedSlotId} onChange={e => setSelectedSlotId(e.target.value)} sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                {SLOTS.map(s => <MenuItem value={s.id} key={s.id} sx={{ fontSize: 12, fontFamily: 'monospace' }}>{s.id}</MenuItem>)}
              </Select>
            </FormControl>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1.7, mb: 0.6 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{slot.id}</Typography>
              <Chip size="small" label={slotReserved ? 'Reserved' : pallet ? 'Occupied' : 'Available'} sx={{
                bgcolor: slotReserved ? '#fff2da' : pallet ? '#eaf2ff' : '#e7f7f0',
                color: slotReserved ? '#a87226' : pallet ? '#2a69ba' : '#15856f', fontSize: 10, height: 23,
              }} />
            </Stack>
            <Typography sx={{ color: '#8795a7', fontSize: 11, mb: 1.7 }}>Row {slot.row} · Bay {String(slot.bay).padStart(2, '0')} · Level {String(slot.level).padStart(2, '0')}</Typography>
            <Box sx={{ bgcolor: '#f5f8fc', p: 1.5, borderRadius: 2, mb: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}><Typography sx={{ color: '#8192a4', fontSize: 11 }}>Pallet ID</Typography><Typography sx={{ ...monoSx, fontWeight: 800 }}>{pallet?.id ?? '—'}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}><Typography sx={{ color: '#8192a4', fontSize: 11 }}>SKU</Typography><Typography sx={{ ...monoSx }}>{pallet?.sku ?? '—'}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ color: '#8192a4', fontSize: 11 }}>Load weight</Typography><Typography sx={{ ...monoSx }}>{pallet ? `${pallet.weightKg} kg` : '—'}</Typography></Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button fullWidth size="small" variant="contained" startIcon={<AddCircleOutline />} disabled={!!pallet || slotReserved} onClick={() => queue('PUTAWAY')} sx={{ whiteSpace: 'nowrap', fontSize: 11.5 }}>Putaway</Button>
              <Button fullWidth size="small" variant="outlined" disabled={!pallet || slotReserved} onClick={() => queue('RETRIEVAL')} sx={{ whiteSpace: 'nowrap', fontSize: 11.5 }}>Retrieve</Button>
            </Stack>
            <Typography sx={{ mt: 1.2, color: '#95a4b4', fontSize: 10, lineHeight: 1.5 }}>Commands affect this local demonstration only. No PLC writes.</Typography>
          </Paper>

          <Paper id="equipment" sx={{ ...panelSx, p: 2.2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.7 }}><SensorsOutlined sx={{ color: '#236de8', fontSize: 19 }} /><Typography sx={{ fontSize: 15, fontWeight: 800 }}>Equipment Status</Typography></Stack>
            <FleetRow icon={<PrecisionManufacturingOutlined fontSize="small" />} name="Stacker crane" id="CR-01" color="#d0a13e" status={active ? 'MOVING' : 'READY'} detail={`X ${sim.crane.x.toFixed(1)}m · Z ${sim.crane.y.toFixed(1)}m`} />
            <Divider />
            <FleetRow icon={<LocalShippingOutlined fontSize="small" />} name="Forklift" id="FL-01" color="#cd973a" status={active ? 'ACTIVE' : 'IDLE'} detail={`Position X ${sim.forklift.x.toFixed(1)}m`} />
            <Divider />
            <FleetRow icon={<RouteOutlined fontSize="small" />} name="AGV fleet" id="AGV-01/02" color="#299dba" status="PATROL" detail="2 autonomous mock routes" />
            <Box sx={{ borderRadius: 2, bgcolor: '#eaf6f3', p: 1.3, mt: 1.25, display: 'flex', alignItems: 'start', gap: 1 }}>
              <SettingsSuggestOutlined sx={{ color: '#168b7b', fontSize: 18 }} />
              <Typography sx={{ fontSize: 10.8, color: '#4f8b80', lineHeight: 1.4 }}>Telemetry is synthesized locally, not from WCS, OPC UA or Gazebo.</Typography>
            </Box>
          </Paper>
        </Stack>
      </Box>

      <Box id="inventory" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', xl: 'minmax(0,1.5fr) minmax(0,1fr)' }, gap: 2, mt: 2 }}>
        <Paper id="tasks" sx={{ ...panelSx, p: 0, minWidth: 0 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'start', sm: 'center' }} gap={1} sx={{ p: 2.2, borderBottom: '1px solid #edf1f5' }}>
            <Box><Typography sx={{ fontSize: 15.5, fontWeight: 800 }}>Simulation Task Queue</Typography>
              <Typography sx={{ color: '#91a0b0', fontSize: 11, mt: 0.4 }}>Mock dispatch → crane → putaway or retrieval</Typography></Box>
            <Button size="small" startIcon={<AddCircleOutline />} variant="outlined" onClick={createSamplePutaway}>Create demo task</Button>
          </Stack>
          <TableContainer sx={{ maxHeight: 290 }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow>{['Task ID', 'Operation', 'Rack', 'Current phase', 'Status'].map(x => <TableCell key={x} sx={{ bgcolor: '#f7f9fc', color: '#7e90a5', fontWeight: 800, fontSize: 10.5, py: 1.3 }}>{x}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {sim.tasks.length ? sim.tasks.map(t => <TaskRow key={t.id} task={t} />) :
                  <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, color: '#92a1b3', fontSize: 12 }}>No tasks yet. Select an empty rack and create your first putaway.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        <Paper sx={{ ...panelSx, p: 0, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2.2, borderBottom: '1px solid #edf1f5' }}>
            <Box><Typography sx={{ fontSize: 15.5, fontWeight: 800 }}>Event Stream</Typography>
              <Typography sx={{ color: '#91a0b0', fontSize: 11, mt: 0.4 }}>Recent simulated warehouse activity</Typography></Box>
            <Chip size="small" label={`${sim.events.length} events`} sx={{ bgcolor: '#eff4f9', color: '#6d8198', fontSize: 10 }} />
          </Stack>
          <Box sx={{ maxHeight: 290, overflowY: 'auto', p: 2.1 }}>
            {sim.events.map((e, i) => <Stack key={e.id} direction="row" alignItems="start" spacing={1.2} sx={{ mb: i === sim.events.length - 1 ? 0 : 1.7 }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', mt: 0.6, flexShrink: 0, bgcolor: e.type === 'COMPLETE' ? '#22b38c' : e.type === 'EQUIPMENT' ? '#dda44b' : '#4e8fea' }} />
              <Box sx={{ minWidth: 0, flex: 1 }}><Typography sx={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.4 }}>{e.message}</Typography>
                <Typography sx={{ color: '#a0adbd', fontSize: 10, mt: 0.2 }}>T+{e.at.toFixed(1)}s · {e.type}</Typography></Box>
            </Stack>)}
          </Box>
        </Paper>
      </Box>

      <Paper sx={{ ...panelSx, mt: 2, p: 2.0, bgcolor: '#fdfefe' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'start', sm: 'center' }} justifyContent="space-between" spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1.2}><Architecture sx={{ color: '#70849c', fontSize: 20 }} />
            <Box><Typography sx={{ fontWeight: 800, fontSize: 12.5 }}>Simulation data flow</Typography>
              <Typography sx={{ color: '#8695a7', fontSize: 11 }}>Mock task engine → in-browser equipment positions → 3D scene</Typography></Box></Stack>
          <Chip variant="outlined" size="small" label="No backend required" sx={{ borderColor: '#bfdcd3', color: '#238e73', fontSize: 10 }} />
        </Stack>
      </Paper>
      <Typography sx={{ textAlign: 'center', color: '#a1adba', fontSize: 11, py: 2.5 }}>WM Warehouse · React + MUI + Three.js + React Three Fiber · 3D mock + read-only integration preview</Typography>
    </Box>
    <DeviceIntegrationDialog open={integrationOpen} onClose={() => setIntegrationOpen(false)} {...device} />
    <Snackbar open={!!notice} autoHideDuration={3500} onClose={() => setNotice('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <Alert severity="info" onClose={() => setNotice('')} variant="filled" sx={{ fontWeight: 600 }}>{notice}</Alert>
    </Snackbar>
  </Box>;
}
