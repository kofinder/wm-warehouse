/** Warehouse simulation data: intentionally mock-only, not PLC telemetry. */
export type RowId = 'A' | 'B';
export type Operation = 'PUTAWAY' | 'RETRIEVAL';
export type TaskStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED';

export type Slot = {
  id: string;
  row: RowId;
  bay: number;
  level: number;
  x: number;
  y: number;
  z: number;
};
export type Pallet = {
  id: string;
  sku: string;
  slotId: string;
  weightKg: number;
  color: string;
};
export type WarehouseTask = {
  id: string;
  operation: Operation;
  slotId: string;
  pallet: Pallet;
  status: TaskStatus;
  phase: string;
  elapsed: number;
  progress: number;
  startX: number;
  startY: number;
};
export type WarehouseEvent = { id: number; at: number; type: string; message: string };
export type FleetPosition = { x: number; y: number; z: number; heading: number };
export type SimulationState = {
  time: number;
  running: boolean;
  speed: number;
  inventory: Pallet[];
  tasks: WarehouseTask[];
  events: WarehouseEvent[];
  crane: { x: number; y: number };
  forklift: FleetPosition;
  agvs: FleetPosition[];
  nextTask: number;
  nextEvent: number;
};

export const BAY_COUNT = 8;
export const LEVEL_COUNT = 3;
export const TOTAL_SLOTS = 2 * BAY_COUNT * LEVEL_COUNT;
export const SLOT_COLORS = ['#55b9de', '#f0ae52', '#9b91de', '#50bea0', '#e78180'];

const bayX = (bay: number) => -8.4 + (bay - 1) * 2.4;
export const SLOTS: Slot[] = (['A', 'B'] as RowId[]).flatMap(row =>
  Array.from({ length: BAY_COUNT }, (_, b) => b + 1).flatMap(bay =>
    Array.from({ length: LEVEL_COUNT }, (_, l) => l + 1).map(level => ({
      id: `${row}-${String(bay).padStart(2, '0')}-${String(level).padStart(2, '0')}`,
      row, bay, level,
      x: bayX(bay), y: 1.05 + (level - 1) * 1.55, z: row === 'A' ? -4.15 : 4.15,
    }))
  )
);
export const SLOT_BY_ID: Record<string, Slot> = Object.fromEntries(SLOTS.map(s => [s.id, s]));

export function startingInventory(): Pallet[] {
  // Stable, reproducible inventory: 18 occupied out of 48 slots.
  return Array.from({ length: 18 }, (_, i) => {
    const slot = SLOTS[(i * 13 + 2) % TOTAL_SLOTS];
    return {
      id: `PLT-${String(1001 + i)}`,
      sku: ['SKU-BOX-100', 'SKU-AUTO-210', 'SKU-FOOD-320', 'SKU-TECH-420'][i % 4],
      slotId: slot.id,
      weightKg: 210 + ((i * 67) % 540),
      color: SLOT_COLORS[i % SLOT_COLORS.length],
    };
  });
}

const baseForklift: FleetPosition = { x: -11.5, y: 0, z: 6.8, heading: 0 };
const agvPosition = (t: number, index: number): FleetPosition => {
  const p = ((t * 0.17 + index * 2.3) % 4 + 4) % 4;
  // A rectangular, clearly marked mock patrol route around the loading zone.
  if (p < 1) return { x: -10.5 + p * 20.8, y: 0, z: 8.0, heading: Math.PI / 2 };
  if (p < 2) return { x: 10.3, y: 0, z: 8 - (p - 1) * 3.1, heading: Math.PI };
  if (p < 3) return { x: 10.3 - (p - 2) * 20.8, y: 0, z: 4.9, heading: -Math.PI / 2 };
  return { x: -10.5, y: 0, z: 4.9 + (p - 3) * 3.1, heading: 0 };
};

export function initialSimulation(): SimulationState {
  return {
    time: 0,
    running: true,
    speed: 1,
    inventory: startingInventory(),
    tasks: [],
    events: [{ id: 1, at: 0, type: 'SYSTEM', message: 'Demo warehouse initialized · 48 rack locations online' }],
    crane: { x: -6, y: 0.65 },
    forklift: baseForklift,
    agvs: [agvPosition(0, 0), agvPosition(0, 1)],
    nextTask: 1,
    nextEvent: 2,
  };
}

function event(state: SimulationState, type: string, message: string) {
  const nextId = state.nextEvent++;
  state.events = [{ id: nextId, at: state.time, type, message }, ...state.events].slice(0, 28);
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));
export const TASK_SECONDS = 13;

export function createTask(state: SimulationState, operation: Operation, slotId: string): SimulationState {
  const slot = SLOT_BY_ID[slotId];
  if (!slot) throw new Error('Choose a valid rack location.');
  if (state.tasks.some(t => t.slotId === slotId && t.status !== 'COMPLETED')) {
    throw new Error(`Location ${slotId} already has a pending task.`);
  }
  const existing = state.inventory.find(p => p.slotId === slotId);
  if (operation === 'PUTAWAY' && existing) throw new Error(`Location ${slotId} is occupied.`);
  if (operation === 'RETRIEVAL' && !existing) throw new Error(`Location ${slotId} is empty.`);
  const pallet = existing ?? {
    id: `PLT-${String(3000 + state.nextTask)}`,
    sku: ['SKU-NEW-300', 'SKU-SPARE-510', 'SKU-INBOUND-700'][state.nextTask % 3],
    slotId,
    weightKg: 240 + ((state.nextTask * 83) % 490),
    color: SLOT_COLORS[state.nextTask % SLOT_COLORS.length],
  };
  const task: WarehouseTask = {
    id: `TASK-${String(state.nextTask).padStart(4, '0')}`,
    operation, slotId, pallet,
    status: 'QUEUED', phase: 'Waiting for equipment', elapsed: 0, progress: 0,
    startX: state.crane.x, startY: state.crane.y,
  };
  const next = { ...state, nextTask: state.nextTask + 1, tasks: [task, ...state.tasks].slice(0, 30), events: [...state.events] };
  event(next, 'TASK', `${task.id} · ${operation.toLowerCase()} queued for ${slotId}`);
  return next;
}

function stage(task: WarehouseTask): string {
  const t = task.elapsed;
  if (task.operation === 'PUTAWAY') {
    if (t < 2.4) return 'Forklift inbound delivery';
    if (t < 4.0) return 'Pallet on conveyor';
    if (t < 5.0) return 'Crane loading';
    if (t < 9.6) return 'Crane transport';
    if (t < 11.4) return 'Fork rack placement';
    return 'PLC completion verification';
  }
  if (t < 4.0) return 'Crane approaching rack';
  if (t < 5.2) return 'Fork rack pickup';
  if (t < 9.5) return 'Crane to outbound';
  if (t < 11.4) return 'Outbound conveyor';
  return 'Forklift collection';
}

export function advanceSimulation(original: SimulationState, realSeconds: number): SimulationState {
  if (!original.running) return original;
  const dt = Math.min(0.12, Math.max(0, realSeconds)) * original.speed;
  if (!dt) return original;
  const state: SimulationState = {
    ...original,
    time: original.time + dt,
    tasks: original.tasks.map(t => ({ ...t })),
    events: [...original.events],
    crane: { ...original.crane },
    forklift: { ...original.forklift },
    agvs: [agvPosition(original.time + dt, 0), agvPosition(original.time + dt, 1)],
  };
  const task = state.tasks.find(t => t.status === 'RUNNING') ?? state.tasks.slice().reverse().find(t => t.status === 'QUEUED');
  if (!task) {
    state.forklift = baseForklift;
    return state;
  }
  if (task.status === 'QUEUED') {
    task.status = 'RUNNING';
    task.phase = stage(task);
    task.startX = state.crane.x;
    task.startY = state.crane.y;
    event(state, 'TASK', `${task.id} started · ${task.operation} ${task.slotId}`);
  }
  const previousPhase = task.phase;
  task.elapsed = Math.min(TASK_SECONDS, task.elapsed + dt);
  task.progress = Math.min(100, Math.round((task.elapsed / TASK_SECONDS) * 100));
  task.phase = stage(task);
  if (previousPhase !== task.phase) event(state, 'EQUIPMENT', `${task.id} · ${task.phase}`);
  const slot = SLOT_BY_ID[task.slotId];
  const t = task.elapsed;
  if (task.operation === 'PUTAWAY') {
    state.crane.x = t < 4.1 ? lerp(task.startX, -6, t / 4.1) :
      t < 9.6 ? lerp(-6, slot.x, (t - 5.0) / 4.6) : slot.x;
    state.crane.y = t < 4.1 ? lerp(task.startY, 0.65, t / 4.1) :
      t < 9.6 ? lerp(0.65, slot.y, (t - 5.0) / 4.6) : slot.y;
    state.forklift = t < 2.4
      ? { x: lerp(-11.5, -9.3, t / 2.4), y: 0, z: lerp(6.8, 2.3, t / 2.4), heading: Math.PI }
      : { x: lerp(-9.3, -11.5, (t - 2.4) / 2.8), y: 0, z: lerp(2.3, 6.8, (t - 2.4) / 2.8), heading: 0 };
  } else {
    state.crane.x = t < 4 ? lerp(task.startX, slot.x, t / 4) :
      t < 5.2 ? slot.x : lerp(slot.x, -6, (t - 5.2) / 4.3);
    state.crane.y = t < 4 ? lerp(task.startY, slot.y, t / 4) :
      t < 5.2 ? slot.y : lerp(slot.y, 0.65, (t - 5.2) / 4.3);
    state.forklift = t < 11.4 ? baseForklift :
      { x: lerp(-11.5, -9.3, (t - 11.4) / 1.6), y: 0,
        z: lerp(6.8, 2.3, (t - 11.4) / 1.6), heading: Math.PI };
  }
  if (task.elapsed >= TASK_SECONDS) {
    task.status = 'COMPLETED';
    task.phase = 'Completed · confirmed in mock ledger';
    task.progress = 100;
    if (task.operation === 'PUTAWAY') {
      state.inventory = [...state.inventory, task.pallet];
    } else {
      state.inventory = state.inventory.filter(p => p.id !== task.pallet.id);
    }
    event(state, 'COMPLETE', `${task.id} · ${task.operation.toLowerCase()} verified for ${task.pallet.id} at ${task.slotId}`);
  }
  return state;
}

export function activeTask(state: SimulationState): WarehouseTask | undefined {
  return state.tasks.find(t => t.status === 'RUNNING');
}

export function transientPallet(state: SimulationState): { pallet: Pallet; position: [number, number, number] } | null {
  const task = activeTask(state);
  if (!task) return null;
  const t = task.elapsed;
  const slot = SLOT_BY_ID[task.slotId];
  if (task.operation === 'PUTAWAY') {
    if (t < 2.4) return { pallet: task.pallet, position: [state.forklift.x + 0.45, 0.87, state.forklift.z - 0.9] };
    if (t < 4) return { pallet: task.pallet, position: [lerp(-9.3, -6, (t - 2.4) / 1.6), 0.8, 0] };
    if (t < 9.6) return { pallet: task.pallet, position: [state.crane.x, state.crane.y, 0] };
    return { pallet: task.pallet, position: [slot.x, slot.y, lerp(0, slot.z, (t - 9.6) / 1.8)] };
  }
  if (t < 5.2) return null; // pallet remains in rack during approach/pickup
  if (t < 9.5) return { pallet: task.pallet, position: [state.crane.x, state.crane.y, 0] };
  if (t < 11.4) return { pallet: task.pallet, position: [lerp(-6, -9.3, (t - 9.5) / 1.9), 0.8, 0] };
  return { pallet: task.pallet, position: [state.forklift.x + 0.4, 0.87, state.forklift.z - 0.8] };
}
