import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Color } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  SLOTS, SLOT_BY_ID, activeTask, transientPallet, type FleetPosition,
  type Pallet, type RowId, type SimulationState,
} from '../simulation/model';

// Reuse the same color object; SceneContent can re-render often during animation.
const warehouseBackground = new Color('#eaf0f5');

export type CameraView = 'overview' | 'aisle' | 'top';
export type WarehouseSceneProps = {
  simulation: SimulationState;
  selectedSlotId: string;
  onSelectSlot: (slot: string) => void;
  onHoverSlot: (slot: string | null) => void;
  cameraView: CameraView;
};

function PalletModel({ pallet, position, onClick }: {
  pallet: Pallet;
  position: [number, number, number];
  onClick?: () => void;
}) {
  return (
    <group position={position} onClick={onClick}>
      {/* Plank base, carton block and two contrasting cargo bands. */}
      <mesh position={[0, -0.32, 0]}><boxGeometry args={[1.48, 0.16, 1.24]} /><meshStandardMaterial color="#a97849" /></mesh>
      {[-0.43, 0, 0.43].map(x => <mesh key={x} position={[x, -0.42, 0]}>
        <boxGeometry args={[0.24, 0.1, 1.19]} /><meshStandardMaterial color="#825d3f" />
      </mesh>)}
      <mesh position={[0, 0.02, 0]}><boxGeometry args={[1.30, 0.58, 1.08]} /><meshStandardMaterial color={pallet.color} roughness={0.86} /></mesh>
      <mesh position={[0, 0.34, 0]}><boxGeometry args={[1.20, 0.06, 0.96]} /><meshStandardMaterial color="#d8e7f4" /></mesh>
      <mesh position={[0, 0.02, 0.545]}><boxGeometry args={[0.055, 0.58, 0.025]} /><meshStandardMaterial color="#fff1bb" /></mesh>
    </group>
  );
}

function RackBank({ row }: { row: RowId }) {
  const z = row === 'A' ? -4.15 : 4.15;
  return <group>
    {Array.from({ length: 9 }, (_, i) => -9.6 + i * 2.4).flatMap(x => [-0.87, 0.87].map(d =>
      <mesh key={`post-${x}-${d}`} position={[x, 2.66, z + d]}>
        <boxGeometry args={[0.09, 5.32, 0.1]} />
        <meshStandardMaterial color="#557996" metalness={0.42} roughness={0.58} />
      </mesh>
    ))}
    {[0.64, 2.19, 3.74].flatMap(y => [-0.88, 0.88].map(d =>
      <mesh key={`beam-${y}-${d}`} position={[-1.2, y, z + d]}>
        <boxGeometry args={[19.35, 0.12, 0.10]} />
        <meshStandardMaterial color="#e8a640" metalness={0.24} roughness={0.6} />
      </mesh>
    ))}
    {[0.65, 2.2, 3.75].map(y =>
      <mesh key={`deck-${y}`} position={[-1.2, y, z]}>
        <boxGeometry args={[19.2, 0.075, 1.68]} />
        <meshStandardMaterial color="#a7bccc" roughness={0.84} />
      </mesh>
    )}
  </group>;
}

function CraneModel({ x, lift }: { x: number; lift: number }) {
  return <group position={[x, 0, 0]}>
    <mesh position={[0, 0.18, 0]}><boxGeometry args={[1.35, 0.32, 2.45]} /><meshStandardMaterial color="#e6ae31" /></mesh>
    {[-0.65, 0.65].map(z => <mesh key={z} position={[0, 3.12, z]}>
      <boxGeometry args={[0.26, 6.0, 0.28]} /><meshStandardMaterial color="#efb73b" metalness={0.38} roughness={0.53} />
    </mesh>)}
    <mesh position={[0, 6.0, 0]}><boxGeometry args={[1.34, 0.27, 1.95]} /><meshStandardMaterial color="#f2c252" /></mesh>
    <mesh position={[0, 0.04, 0]}><boxGeometry args={[1.7, 0.11, 3.2]} /><meshStandardMaterial color="#33445b" /></mesh>
    <group position={[0, lift, 0]}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[1.77, 0.19, 1.7]} /><meshStandardMaterial color="#f4c84c" /></mesh>
      {[-0.43, 0.43].map(a => <mesh key={a} position={[a, -0.1, 1.24]}>
        <boxGeometry args={[0.13, 0.13, 1.75]} /><meshStandardMaterial color="#b8c8d3" metalness={0.66} />
      </mesh>)}
      <mesh position={[0, 0.53, -0.67]}><boxGeometry args={[1.6, 1.2, 0.1]} /><meshStandardMaterial color="#e1a231" /></mesh>
    </group>
    <pointLight position={[0, 5.8, 0]} color="#ffcc63" intensity={1.1} distance={5} />
  </group>;
}

function ForkliftModel({ pos }: { pos: FleetPosition }) {
  return <group position={[pos.x, 0, pos.z]} rotation={[0, pos.heading, 0]}>
    <mesh position={[0, 0.42, 0.38]}><boxGeometry args={[1.25, 0.66, 1.45]} /><meshStandardMaterial color="#e2ab31" /></mesh>
    <mesh position={[0, 1.1, 0.55]}><boxGeometry args={[1.08, 1.12, 0.72]} /><meshStandardMaterial color="#2c4056" metalness={0.18} /></mesh>
    {[-0.54, 0.54].map(x => <mesh key={x} position={[x, 1.25, 0.12]}>
      <boxGeometry args={[0.1, 1.9, 0.1]} /><meshStandardMaterial color="#223448" />
    </mesh>)}
    <mesh position={[0, 2.18, 0.12]}><boxGeometry args={[1.2, 0.12, 0.8]} /><meshStandardMaterial color="#e5b43a" /></mesh>
    <mesh position={[0, 1.02, -0.69]}><boxGeometry args={[1.07, 2.0, 0.12]} /><meshStandardMaterial color="#415365" /></mesh>
    {[-0.34, 0.34].map(x => <mesh key={x} position={[x, 0.21, -1.4]}>
      <boxGeometry args={[0.16, 0.11, 1.75]} /><meshStandardMaterial color="#b0bdc9" metalness={0.56} />
    </mesh>)}
    {[-0.67, 0.67].flatMap(x => [-0.08, 0.86].map(z => <mesh key={`${x}-${z}`} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.28, 0.28, 0.16, 12]} /><meshStandardMaterial color="#1d2c37" />
    </mesh>))}
    <mesh position={[0, 0.8, 1.13]}><boxGeometry args={[0.72, 0.16, 0.12]} /><meshBasicMaterial color="#fdf2b7" /></mesh>
  </group>;
}

function AgvModel({ pos, index }: { pos: FleetPosition; index: number }) {
  return <group position={[pos.x, 0.06, pos.z]} rotation={[0, pos.heading, 0]}>
    <mesh position={[0, 0.17, 0]}><boxGeometry args={[1.45, 0.30, 0.95]} /><meshStandardMaterial color={index === 0 ? '#27668b' : '#5260ab'} metalness={0.32} /></mesh>
    <mesh position={[0, 0.38, 0]}><boxGeometry args={[1.02, 0.18, 0.66]} /><meshStandardMaterial color="#bed5e5" /></mesh>
    {[-0.57, 0.57].map(x => <mesh key={x} position={[x, 0.30, -0.51]}>
      <sphereGeometry args={[0.10, 10, 10]} /><meshBasicMaterial color="#23e2c6" />
    </mesh>)}
    <mesh position={[0, 0.48, 0]}><boxGeometry args={[0.34, 0.055, 0.34]} /><meshBasicMaterial color="#4fe1da" /></mesh>
  </group>;
}

function WarehouseArchitecture() {
  return <>
    <mesh position={[0, -0.11, 0]} receiveShadow><boxGeometry args={[28, 0.2, 21]} /><meshStandardMaterial color="#dfe8ee" roughness={0.98} /></mesh>
    <gridHelper args={[29, 29, '#b6c9d6', '#c9d8e2']} position={[0, 0.008, 0]} />
    {/* Crane track rails and pedestrian / forklift zones. */}
    {[-0.94, 0.94].map(z => <mesh key={z} position={[-1.2, 0.055, z]}>
      <boxGeometry args={[20.6, 0.10, 0.09]} /><meshStandardMaterial color="#738a9c" metalness={0.7} />
    </mesh>)}
    {[-10.5, 10.5].map(x => <mesh key={x} position={[x, 0.015, 5.1]}>
      <boxGeometry args={[0.08, 0.018, 8.2]} /><meshBasicMaterial color="#e4ad47" />
    </mesh>)}
    {Array.from({ length: 13 }, (_, i) => -10.8 + i * 1.8).map(x =>
      <mesh key={x} position={[x, 0.018, 7.5]}><boxGeometry args={[0.75, 0.018, 0.075]} /><meshBasicMaterial color="#f2c65b" /></mesh>
    )}
    <RackBank row="A" />
    <RackBank row="B" />
    {/* Motorized conveyor visual; material handling is scripted by the mock engine. */}
    <mesh position={[-9.5, 0.39, 0]}><boxGeometry args={[6.2, 0.30, 1.42]} /><meshStandardMaterial color="#445e75" /></mesh>
    {Array.from({ length: 10 }, (_, i) => -12.25 + i * 0.62).map(x =>
      <mesh key={x} position={[x, 0.57, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 1.17, 12]} /><meshStandardMaterial color="#c4d2d9" metalness={0.48} />
      </mesh>
    )}
    {/* Visible work-zone boundaries. */}
    <mesh position={[-11.1, 0.015, 3.3]}><boxGeometry args={[3.2, 0.015, 0.1]} /><meshBasicMaterial color="#ebaa49" /></mesh>
    <mesh position={[10.5, 0.015, 0]}><boxGeometry args={[0.12, 0.015, 9.1]} /><meshBasicMaterial color="#ebaa49" /></mesh>
  </>;
}

function CameraControls({ view }: { view: CameraView }) {
  const controls = useRef<OrbitControls | null>(null);
  const { camera, gl } = useThree();

  // Native Three.js controls: no drei dependency, and compatible with Three 0.153.
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.enableZoom = true;
    orbit.enableRotate = true;
    orbit.enablePan = true;
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.12;
    orbit.minDistance = 4;
    orbit.maxDistance = 60;
    orbit.minPolarAngle = 0.08;
    orbit.maxPolarAngle = Math.PI * 0.495;
    orbit.target.set(0, 2, 0);
    orbit.update();
    controls.current = orbit;
    return () => {
      controls.current = null;
      orbit.dispose();
    };
  }, [camera, gl]);

  useEffect(() => {
    const position: [number, number, number] =
      view === 'top' ? [0, 29, 0.05] :
      view === 'aisle' ? [-12, 7, 12] : [14.7, 15, 21];
    camera.position.set(...position);
    const orbit = controls.current;
    if (orbit) {
      orbit.target.set(0, 2.0, 0);
      orbit.update();
    }
  }, [camera, view]);

  useFrame(() => controls.current?.update());
  return null;
}

function SceneContent({ simulation, selectedSlotId, onSelectSlot, onHoverSlot, cameraView }: WarehouseSceneProps) {
  const moving = transientPallet(simulation);
  const active = activeTask(simulation);
  return <>
    <primitive attach="background" object={warehouseBackground} />
    <fog attach="fog" args={['#eaf0f5', 25, 60]} />
    <ambientLight intensity={1.7} />
    <hemisphereLight args={['#ffffff', '#98aabb', 0.8]} />
    <directionalLight position={[8, 18, 9]} intensity={2.0} />
    <WarehouseArchitecture />
    {SLOTS.map(slot => {
      const selected = selectedSlotId === slot.id;
      return <group key={slot.id} position={[slot.x, slot.y, slot.z]}>
        <mesh onClick={e => { e.stopPropagation(); onSelectSlot(slot.id); }}
          onPointerOver={e => { e.stopPropagation(); onHoverSlot(slot.id); }}
          onPointerOut={() => onHoverSlot(null)}>
          <boxGeometry args={[2.16, 1.24, 1.63]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {selected && <mesh>
          <boxGeometry args={[2.25, 1.35, 1.71]} />
          <meshBasicMaterial color="#2563eb" wireframe transparent opacity={0.9} />
        </mesh>}
      </group>;
    })}
    {simulation.inventory.filter(p => !(active?.operation === 'RETRIEVAL' && active.pallet.id === p.id && active.elapsed >= 5.2))
      .map(p => { const slot = SLOT_BY_ID[p.slotId]; return <PalletModel key={p.id} pallet={p}
        position={[slot.x, slot.y, slot.z]} onClick={() => onSelectSlot(slot.id)} />; })}
    {moving && <PalletModel pallet={moving.pallet} position={moving.position} />}
    <CraneModel x={simulation.crane.x} lift={simulation.crane.y} />
    <ForkliftModel pos={simulation.forklift} />
    {simulation.agvs.map((a, i) => <AgvModel key={i} pos={a} index={i} />)}
    <CameraControls view={cameraView} />
  </>;
}

export default function WarehouseScene(props: WarehouseSceneProps) {
  return <Canvas camera={{ position: [14.7, 15, 21], fov: 42, near: 0.1, far: 130 }}
    dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}>
    <SceneContent {...props} />
  </Canvas>;
}
