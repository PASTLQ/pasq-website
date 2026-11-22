import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

/* モノトーンの粘土ブロック。カーソルの位置で隆起し、スクロールで回る。 */

function useScheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const on = () => setDark(root.dataset.theme === 'dark');
    on();
    const mo = new MutationObserver(on);
    mo.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

function Blocks({ cols, rows, dark, still }: { cols: number; rows: number; dark: boolean; still: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const group = useRef<THREE.Group>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const ptr = useRef({ x: 0, y: 0 });
  const hit = useRef({ x: 99, z: 99 });
  const seeds = useMemo(() => Array.from({ length: cols * rows }, () => Math.random()), [cols, rows]);
  const gap = 1;
  const size = 0.84;

  useEffect(() => {
    const move = (e: PointerEvent) => {
      ptr.current.x = (e.clientX / innerWidth) * 2 - 1;
      ptr.current.y = -((e.clientY / innerHeight) * 2 - 1);
    };
    addEventListener('pointermove', move, { passive: true });
    return () => removeEventListener('pointermove', move);
  }, []);

  useFrame((state) => {
    const t = still ? 2 : state.clock.elapsedTime;

    // カーソル→地面(y=0)への射影
    state.raycaster.setFromCamera(new THREE.Vector2(ptr.current.x, ptr.current.y), state.camera);
    const { origin, direction } = state.raycaster.ray;
    const k = -origin.y / direction.y;
    const tx = still ? 99 : origin.x + direction.x * k;
    const tz = still ? 99 : origin.z + direction.z * k;
    hit.current.x += (tx - hit.current.x) * 0.12;
    hit.current.z += (tz - hit.current.z) * 0.12;

    let i = 0;
    for (let ix = 0; ix < cols; ix++) {
      for (let iz = 0; iz < rows; iz++) {
        const x = (ix - cols / 2 + 0.5) * gap;
        const z = (iz - rows / 2 + 0.5) * gap;
        const dx = x - hit.current.x;
        const dz = z - hit.current.z;
        const wave = 0.5 + 0.5 * Math.sin(x * 0.42 + t * 0.7) * Math.cos(z * 0.38 - t * 0.55);
        const h = 0.2 + wave * 0.85 + seeds[i] * 0.25 + 3.4 * Math.exp(-(dx * dx + dz * dz) / 3.6);
        dummy.position.set(x, h / 2, z);
        dummy.scale.set(size, h, size);
        dummy.updateMatrix();
        mesh.current.setMatrixAt(i++, dummy.matrix);
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;

    const sy = typeof scrollY === 'number' ? scrollY : 0;
    group.current.rotation.y = 0.72 + ptr.current.x * 0.1 + sy * 0.0012;
  });

  const span = Math.max(cols, rows) / 2 + 3;
  return (
    <group ref={group}>
      <ambientLight intensity={dark ? 0.3 : 0.62} />
      <directionalLight
        castShadow
        position={[12, 10, 4]}
        intensity={dark ? 3.6 : 3.1}
        shadow-mapSize={[3072, 3072]}
        shadow-camera-left={-span}
        shadow-camera-right={span}
        shadow-camera-top={span}
        shadow-camera-bottom={-span}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0005}
        shadow-radius={5}
      />
      <instancedMesh ref={mesh} args={[undefined, undefined, cols * rows]} castShadow receiveShadow frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={dark ? '#303036' : '#f6f6f6'} roughness={0.9} metalness={0} />
      </instancedMesh>
    </group>
  );
}

export default function Scene() {
  const dark = useScheme();
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ok, setOk] = useState(true);
  const small = typeof innerWidth === 'number' && innerWidth < 720;
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    try {
      const c = document.createElement('canvas');
      setOk(!!(c.getContext('webgl2') || c.getContext('webgl')));
    } catch {
      setOk(false);
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    if (host.current) io.observe(host.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className="scene" aria-hidden="true">
      {ok && (
        <Canvas
          shadows
          dpr={[1, small ? 1.5 : 2]}
          camera={{ position: [15.5, 18, 21], fov: small ? 30 : 22 }}
          frameloop={visible && !still ? 'always' : 'demand'}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
        >
          <Blocks cols={small ? 22 : 32} rows={small ? 36 : 26} dark={dark} still={still} />
        </Canvas>
      )}
    </div>
  );
}
