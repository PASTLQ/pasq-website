import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* PASQ の彫刻。
   コンクリートの台座と打ち放しの塊、ブラッシュ仕上げの金属フレーム、薄いガラスの箱、
   そこへ絡むツタと苔。ドラッグで視点を回せる。
   照明は「撮影スタジオ」を模した環境(ソフトボックス)を PMREM にして使う。 */

type Dark = boolean;
type Vec3 = [number, number, number];

function useTheme(): Dark {
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

const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* ---------- 環境(ライティング) ---------- */
function studio(gl: THREE.WebGLRenderer, dark: Dark) {
  const k = dark ? 0.5 : 1;
  const scene = new THREE.Scene();

  const dome = new THREE.SphereGeometry(80, 48, 24);
  const colors: number[] = [];
  const pos = dome.attributes.position;
  const top = new THREE.Color().setScalar(0.62 * k);
  const mid = new THREE.Color().setScalar(0.3 * k);
  const bot = new THREE.Color().setScalar(0.07 * k);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 80;
    const c = y > 0 ? mid.clone().lerp(top, Math.pow(y, 0.7)) : mid.clone().lerp(bot, Math.pow(-y, 0.6));
    colors.push(c.r, c.g, c.b);
  }
  dome.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false })));

  const box = (w: number, h: number, p: Vec3, power: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(power * k), side: THREE.DoubleSide, toneMapped: false }),
    );
    m.position.set(...p);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  box(34, 20, [-26, 26, 22], 11); //  キー(左上手前の大きなソフトボックス)
  box(5, 42, [-44, 6, 4], 8); //     左のストリップ
  box(5, 42, [44, 4, -6], 6); //     右のストリップ
  box(46, 46, [0, 52, 0], 4.2); //   天井
  box(60, 7, [0, 12, -52], 6); //    背面のリム
  box(90, 90, [0, -30, 0], 0.55); // 床の照り返し

  const pmrem = new THREE.PMREMGenerator(gl);
  const rt = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose();
  });
  return rt.texture;
}

/* ---------- 打ち放しコンクリートのテクスチャ(手続き生成) ---------- */
function concreteTextures() {
  const N = 512;
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const vnoise = (x: number, y: number, f: number) => {
    const gx = x * f;
    const gy = y * f;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const tx = gx - x0, ty = gy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const wx = (v: number) => ((v % f) + f) % f;
    const a = hash(wx(x0), wx(y0)), b = hash(wx(x0 + 1), wx(y0));
    const c = hash(wx(x0), wx(y0 + 1)), d = hash(wx(x0 + 1), wx(y0 + 1));
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
  const col = document.createElement('canvas');
  const bump = document.createElement('canvas');
  col.width = col.height = bump.width = bump.height = N;
  const cc = col.getContext('2d')!;
  const bc = bump.getContext('2d')!;
  const ci = cc.createImageData(N, N);
  const bi = bc.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      let n = 0, amp = 0.5, tot = 0;
      for (let o = 0, f = 6; o < 6; o++, f *= 2, amp *= 0.55) {
        n += vnoise(u, v, f) * amp;
        tot += amp;
      }
      n /= tot;
      const r = hash(x + 7, y + 13);
      const pit = r > 0.992 ? 0.45 : 0; // 気泡
      const fleck = r < 0.006 ? 0.22 : 0; // 細かな骨材の白い粒
      const g = Math.max(0, Math.min(1, 0.68 + (n - 0.5) * 0.16 - pit * 0.6 + fleck));
      const c8 = Math.round(g * 255);
      const i = (y * N + x) * 4;
      ci.data[i] = ci.data[i + 1] = ci.data[i + 2] = c8;
      ci.data[i + 3] = 255;
      const b8 = Math.round(Math.max(0, Math.min(1, n * 1.05 - pit * 1.5 + fleck * 0.6)) * 255);
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = b8;
      bi.data[i + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0);
  bc.putImageData(bi, 0, 0);
  const mk = (c: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: mk(col, true), bump: mk(bump, false) };
}

/* ---------- 刻印「PASQ」のテクスチャ ---------- */
function engraveTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.font = '600 92px "Inter Tight Variable", "Inter Tight", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  (g as unknown as { letterSpacing: string }).letterSpacing = '14px';
  g.fillStyle = '#ffffff';
  g.fillText('PASQ', c.width / 2 + 7, c.height / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- マテリアル ---------- */
function makeMaterials(dark: Dark) {
  const env = dark ? 1.15 : 1;
  const tex = concreteTextures();
  const concrete = new THREE.MeshStandardMaterial({
    color: dark ? '#bdbbb7' : '#ebe9e5', map: tex.map, bumpMap: tex.bump, bumpScale: 0.5,
    roughness: 0.95, metalness: 0, envMapIntensity: 0.6 * env,
  });
  const frame = new THREE.MeshPhysicalMaterial({
    color: '#5b5a59', metalness: 1, roughness: 0.4, anisotropy: 0.7, anisotropyRotation: 0, envMapIntensity: 1.15 * env,
  });
  const steel = new THREE.MeshPhysicalMaterial({
    color: '#cfd0d1', metalness: 1, roughness: 0.3, anisotropy: 0.6, envMapIntensity: 1.2 * env,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 1, thickness: 0.05, ior: 1.52, roughness: 0.01,
    attenuationColor: new THREE.Color('#7fd0b4'), attenuationDistance: 1.6,
    specularIntensity: 1, envMapIntensity: 0.6 * env,
  });
  const solid = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 1, thickness: 0.7, ior: 1.54, roughness: 0.01,
    attenuationColor: new THREE.Color('#8fd9be'), attenuationDistance: 1.6,
    specularIntensity: 1, envMapIntensity: 1.7 * env,
  });
  const stem = new THREE.MeshStandardMaterial({ color: '#5e5a35', roughness: 0.7 });
  const leaf = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  const moss = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, envMapIntensity: 0.35 });
  const edge = new THREE.LineBasicMaterial({ color: '#6fcfae', transparent: true, opacity: 0.85 });
  const engrave = new THREE.MeshBasicMaterial({ map: null, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false });
  return { concrete, frame, steel, glass, solid, stem, leaf, moss, edge, engrave, textures: tex };
}
type Mats = ReturnType<typeof makeMaterials>;
const MatCtx = createContext<Mats>(null as unknown as Mats);
const useMats = () => useContext(MatCtx);

/* ---------- 部品 ---------- */
function RBox({ size, pos, mat, r = 0.012, cast = true, children }: {
  size: Vec3; pos: Vec3; mat: keyof Pick<Mats, 'concrete' | 'frame' | 'steel' | 'glass' | 'solid'>; r?: number; cast?: boolean; children?: React.ReactNode;
}) {
  const mats = useMats();
  const geo = useMemo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 3, Math.min(r, size[0] / 2.2, size[1] / 2.2, size[2] / 2.2)), [size[0], size[1], size[2], r]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} material={mats[mat]} position={pos} castShadow={cast && mat !== 'glass' && mat !== 'solid'} receiveShadow>
      {children}
    </mesh>
  );
}

const T = 0.11; // フレーム材の太さ

/** 軸に平行な角材。端は相手の面に差し込む */
function Bar({ a, b, t = T, mat = 'frame' }: { a: Vec3; b: Vec3; t?: number; mat?: 'frame' | 'steel' }) {
  const d = [Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2])];
  const size: Vec3 = [Math.max(d[0], t), Math.max(d[1], t), Math.max(d[2], t)];
  const pos: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return <RBox size={size} pos={pos} mat={mat} />;
}

/** 矩形フレーム(x0..x1, y0..y1, 奥行き z) */
function Frame({ x0, x1, y0, y1, z }: { x0: number; x1: number; y0: number; y1: number; z: number }) {
  const h = T / 2;
  return (
    <group>
      <Bar a={[x0 - h, y0, z]} b={[x1 + h, y0, z]} />
      <Bar a={[x0 - h, y1, z]} b={[x1 + h, y1, z]} />
      <Bar a={[x0, y0 + h, z]} b={[x0, y1 - h, z]} />
      <Bar a={[x1, y0 + h, z]} b={[x1, y1 - h, z]} />
    </group>
  );
}

/** 奥行き方向(z)の連結材。フレームに差し込むため、少し細くする */
const ZBar = ({ x, y, z0, z1 }: { x: number; y: number; z0: number; z1: number }) => <Bar a={[x, y, z0]} b={[x, y, z1]} t={T * 0.86} />;

/** ステンレスの小さな取付プレートとボルト(z 方向に向く) */
function Plate({ pos, w = 0.3, h = 0.26 }: { pos: Vec3; w?: number; h?: number }) {
  const mats = useMats();
  const bolt = useMemo(() => new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), []);
  useEffect(() => () => bolt.dispose(), [bolt]);
  const o: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  return (
    <group position={pos}>
      <RBox size={[w, h, 0.03]} pos={[0, 0, 0]} mat="steel" r={0.008} />
      {o.map(([sx, sy], i) => (
        <mesh key={i} geometry={bolt} material={mats.steel} position={[sx * (w / 2 - 0.05), sy * (h / 2 - 0.05), 0.022]} rotation-x={Math.PI / 2} castShadow />
      ))}
    </group>
  );
}

/** 薄いガラス板で組んだ箱(中空) */
function GlassBox({ c, s, children }: { c: Vec3; s: Vec3; children?: React.ReactNode }) {
  const t = 0.035;
  const [w, h, d] = s;
  const mats = useMats();
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), [w, h, d]);
  useEffect(() => () => edges.dispose(), [edges]);
  return (
    <group position={c}>
      <lineSegments geometry={edges} material={mats.edge} />
      <RBox size={[w, t, d]} pos={[0, -h / 2 + t / 2, 0]} mat="glass" r={0.01} />
      <RBox size={[w, t, d]} pos={[0, h / 2 - t / 2, 0]} mat="glass" r={0.01} />
      <RBox size={[t, h - 2 * t, d]} pos={[-w / 2 + t / 2, 0, 0]} mat="glass" r={0.01} />
      <RBox size={[t, h - 2 * t, d]} pos={[w / 2 - t / 2, 0, 0]} mat="glass" r={0.01} />
      <RBox size={[w - 2 * t, h - 2 * t, t]} pos={[0, 0, -d / 2 + t / 2]} mat="glass" r={0.01} />
      <RBox size={[w - 2 * t, h - 2 * t, t]} pos={[0, 0, d / 2 - t / 2]} mat="glass" r={0.01} />
      {children}
    </group>
  );
}

/** 厚みのある無垢のガラスブロック(面取り) */
const SolidCube = ({ c, s }: { c: Vec3; s: Vec3 }) => <RBox size={s} pos={c} mat="solid" r={0.07} />;

/** 断面を z 方向に押し出したコンクリートの塊 */
function Extruded({ profile, depth, z0 }: { profile: [number, number][]; depth: number; z0: number }) {
  const mats = useMats();
  const geo = useMemo(() => {
    const sh = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, curveSegments: 1 });
    g.translate(0, 0, z0);
    return g;
  }, [profile, depth, z0]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={mats.concrete} castShadow receiveShadow />;
}

/* ---------- 苔 ---------- */
type Patch = { x: [number, number]; z: [number, number]; y: number; n: number };
function Moss({ patches, seed = 3 }: { patches: Patch[]; seed?: number }) {
  const mats = useMats();
  const ref = useRef<THREE.InstancedMesh>(null!);
  const total = patches.reduce((a, p) => a + p.n, 0);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => {
    const rand = rng(seed);
    const d = new THREE.Object3D();
    const palette = ['#2c4a1c', '#37591f', '#467128', '#5a8230', '#759a3a', '#8aae4a'].map((c) => new THREE.Color(c));
    let i = 0;
    for (const p of patches) {
      for (let k = 0; k < p.n; k++) {
        const u = rand(), v = rand();
        const s = 0.016 + rand() * 0.034;
        d.position.set(p.x[0] + (p.x[1] - p.x[0]) * u, p.y + s * 0.5 + rand() * 0.035, p.z[0] + (p.z[1] - p.z[0]) * v);
        d.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        d.scale.set(s * (0.9 + rand() * 0.5), s * (0.6 + rand() * 0.3), s * (0.9 + rand() * 0.5));
        d.updateMatrix();
        ref.current.setMatrixAt(i, d.matrix);
        ref.current.setColorAt(i, palette[Math.min(palette.length - 1, Math.floor(Math.pow(rand(), 1.3) * palette.length))]);
        i++;
      }
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [patches, seed, mats.moss]);
  return <instancedMesh ref={ref} args={[geo, mats.moss, total]} castShadow receiveShadow frustumCulled={false} />;
}

/* ---------- ツタ ---------- */
const VINES: Vec3[][] = [
  [[-0.7, 5.35, -0.6], [-0.2, 5.05, -0.3], [0.3, 5.3, 0.2], [0.9, 4.9, 0.0], [1.35, 4.55, 0.75], [1.9, 4.15, 0.95], [2.6, 4.02, 0.8], [3.25, 4.4, 0.72], [3.3, 5.1, 0.6], [3.12, 5.62, 0.3], [2.7, 5.78, 0.4]],
  [[-3.2, 2.95, 0.8], [-3.55, 2.6, 1.1], [-3.3, 2.0, 1.4], [-2.9, 1.4, 1.55], [-2.55, 0.95, 1.65], [-2.2, 0.55, 1.85]],
  [[-2.5, 3.45, -0.3], [-2.85, 3.2, -0.7], [-2.62, 2.6, -0.88], [-2.75, 2.2, -0.55], [-3.05, 1.85, 0.05]],
  [[-0.9, 4.1, 0.0], [-0.8, 3.8, 0.25], [-0.9, 3.3, 0.55], [-0.5, 2.8, 0.75], [0.1, 2.5, 0.5], [0.7, 2.4, 0.2], [1.1, 2.1, 0.6], [0.9, 1.6, 0.95], [0.5, 1.5, 1.2], [0.4, 1.1, 1.45], [0.55, 0.6, 1.55]],
  [[-1.8, 1.4, 1.5], [-1.2, 1.0, 1.72], [-0.5, 0.85, 1.5], [0.2, 1.0, 1.3], [0.8, 0.7, 1.75], [1.3, 0.3, 1.85]],
  [[2.4, 2.3, 1.3], [2.7, 2.8, 1.2], [3.0, 3.4, 1.0], [3.1, 3.9, 0.82], [2.9, 4.3, 0.95], [3.25, 3.0, 1.6]],
  [[-1.5, 4.05, 0.9], [-1.0, 4.3, 0.5], [-0.4, 3.9, 0.3], [0.2, 4.2, 0.4], [0.5, 3.7, 0.8], [0.1, 3.2, 1.0]],
];

function Ivy({ still }: { still: boolean }) {
  const mats = useMats();
  const ref = useRef<THREE.InstancedMesh>(null!);
  const data = useMemo(() => {
    const rand = rng(11);
    const curves = VINES.map((p) => new THREE.CatmullRomCurve3(p.map((q) => new THREE.Vector3(...q)), false, 'catmullrom', 0.5));
    const tubes = curves.map((c) => new THREE.TubeGeometry(c, Math.max(40, Math.round(c.getLength() * 40)), 0.011, 5, false));
    const leaves: { p: THREE.Vector3; r: THREE.Euler; s: number; ph: number; c: THREE.Color }[] = [];
    const greens = ['#3d6b25', '#4b7d2c', '#5b8f33', '#2f5a1f', '#6a9a3c'].map((c) => new THREE.Color(c));
    for (const c of curves) {
      const n = Math.round(c.getLength() * 38);
      for (let i = 0; i < n; i++) {
        const t = (i + rand() * 0.8) / n;
        const p = c.getPointAt(Math.min(0.999, t));
        const off = 0.03 + rand() * 0.06;
        const a = rand() * Math.PI * 2;
        p.add(new THREE.Vector3(Math.cos(a) * off, (rand() - 0.5) * off, Math.sin(a) * off));
        leaves.push({
          p,
          r: new THREE.Euler(rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI),
          s: 0.06 + rand() * 0.07,
          ph: rand() * 10,
          c: greens[Math.floor(rand() * greens.length)],
        });
      }
    }
    const leafGeo = new THREE.CircleGeometry(0.5, 10);
    leafGeo.scale(0.82, 1.1, 1);
    return { tubes, leaves, leafGeo };
  }, []);

  useEffect(() => () => {
    data.tubes.forEach((g) => g.dispose());
    data.leafGeo.dispose();
  }, [data]);

  const d = useMemo(() => new THREE.Object3D(), []);
  const write = (t: number) => {
    const im = ref.current;
    data.leaves.forEach((l, i) => {
      d.position.copy(l.p);
      d.rotation.set(l.r.x + Math.sin(t * 1.1 + l.ph) * 0.14, l.r.y + Math.sin(t * 0.8 + l.ph * 1.7) * 0.16, l.r.z);
      d.scale.setScalar(l.s);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(() => {
    data.leaves.forEach((l, i) => ref.current.setColorAt(i, l.c));
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    write(0);
  }, [data, mats.leaf]);
  useFrame((s) => {
    if (!still) write(s.clock.elapsedTime);
  });

  return (
    <group>
      {data.tubes.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.stem} castShadow />
      ))}
      <instancedMesh ref={ref} args={[data.leafGeo, mats.leaf, data.leaves.length]} castShadow frustumCulled={false} />
    </group>
  );
}

/* ---------- 彫刻の本体 ---------- */
const C_PROFILE: [number, number][] = [
  [-2.4, 3.5], [-0.6, 3.5], [-0.6, 4.05], [-2.0, 4.05], [-2.0, 4.55], [-0.6, 4.55], [-0.6, 5.3], [-2.4, 5.3],
];
const STAIR_PROFILE: [number, number][] = [
  [-0.4, 0], [2.9, 0], [2.9, 2.2], [1.7, 2.2], [1.7, 1.6], [0.7, 1.6], [0.7, 0.8], [-0.4, 0.8],
];
const MOSS: Patch[] = [
  { x: [-1.95, -0.7], z: [-0.6, 0.15], y: 4.06, n: 900 }, //  左上の塊のくぼみ
  { x: [-0.3, 0.65], z: [0.75, 1.55], y: 0.81, n: 700 }, //   段の上(下)
  { x: [0.8, 1.65], z: [0.8, 1.5], y: 1.61, n: 520 }, //       段の上(中)
  { x: [-1.35, 0.35], z: [0.4, 1.2], y: 1.46, n: 800 }, //    棚状のトラフ
  { x: [0.25, 1.35], z: [-0.55, 0.35], y: 0.04, n: 700 }, //  下段のガラス箱の内側
];

function Sculpture({ still }: { still: boolean }) {
  const mats = useMats();
  const [engraveTex, setEngraveTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let alive = true;
    const make = () => {
      if (!alive) return;
      const t = engraveTexture();
      mats.engrave.map = t;
      mats.engrave.needsUpdate = true;
      setEngraveTex(t);
    };
    (document.fonts?.load?.('600 92px "Inter Tight Variable"') ?? Promise.resolve()).then(make, make);
    return () => {
      alive = false;
    };
  }, [mats]);

  const G1: Vec3 = [2.25, 4.81, -0.2];
  const G1s: Vec3 = [1.9, 1.7, 1.7];

  return (
    <group>
      {/* 台座 */}
      <RBox size={[6.0, 0.34, 4.2]} pos={[0.1, -0.17, 0]} mat="concrete" r={0.03} />

      {/* コンクリートの塊 */}
      <Extruded profile={C_PROFILE} depth={1.4} z0={-1.2} />
      <Extruded profile={STAIR_PROFILE} depth={1.1} z0={0.55} />
      <RBox size={[1.9, 0.5, 0.95]} pos={[-0.55, 1.2, 0.8]} mat="concrete" r={0.03} />

      {/* フレーム */}
      <Frame x0={-1.5} x1={2.0} y0={0.1} y1={4.0} z={0.9} />
      <Frame x0={-2.6} x1={-0.3} y0={1.55} y1={5.4} z={-0.8} />
      <Frame x0={1.2} x1={3.1} y0={0.1} y1={2.9} z={1.5} />
      <Frame x0={0.3} x1={3.2} y0={3.85} y1={5.6} z={-0.6} />
      <Frame x0={-2.2} x1={1.0} y0={0.1} y1={1.3} z={1.9} />
      <ZBar x={-1.5} y={1.55} z0={0.9} z1={-0.8} />
      <ZBar x={2.0} y={3.85} z0={0.9} z1={-0.6} />
      <ZBar x={2.0} y={2.9} z0={0.9} z1={1.5} />
      <ZBar x={-1.5} y={1.3} z0={0.9} z1={1.9} />
      <ZBar x={-2.6} y={1.55} z0={-0.8} z1={1.4} />
      <ZBar x={-1.9} y={1.55} z0={-0.8} z1={1.4} />
      <ZBar x={2.0} y={2.78} z0={-0.7} z1={0.9} />
      <Bar a={[-0.3, 4.3, -0.7]} b={[0.3, 4.3, -0.7]} t={T * 0.86} />
      <Bar a={[-1.5, 3.1, 0.9]} b={[-0.5, 3.1, 0.9]} t={T * 0.86} />
      <Plate pos={[-1.5, 1.55, 0.97]} />
      <Plate pos={[2.0, 2.9, 0.97]} w={0.26} h={0.3} />
      <Plate pos={[-1.5, 1.3, 0.97]} w={0.26} h={0.3} />
      <Plate pos={[2.0, 2.78, 0.97]} />
      <Plate pos={[-0.5, 3.1, 0.97]} w={0.22} h={0.24} />
      <Plate pos={[0.3, 4.3, -0.64]} w={0.22} h={0.24} />

      {/* ガラスの箱 */}
      <RBox size={[2.1, 0.05, 1.9]} pos={[G1[0], 3.93, G1[2]]} mat="steel" r={0.01} />
      <GlassBox c={G1} s={G1s}>
        {/* 刻印: 手前の面の右下の角(ガラスに固定、視点を変えると一緒に傾く) */}
        {engraveTex && (
          <mesh position={[G1s[0] / 2 - 0.62, -G1s[1] / 2 + 0.3, G1s[2] / 2 + 0.006]} material={mats.engrave} renderOrder={5}>
            <planeGeometry args={[0.8, 0.25]} />
          </mesh>
        )}
      </GlassBox>

      <RBox size={[1.8, 0.05, 1.5]} pos={[-2.5, 1.585, 0.7]} mat="steel" r={0.01} />
      <GlassBox c={[-2.5, 2.26, 0.7]} s={[1.6, 1.3, 1.4]} />

      <RBox size={[1.3, 0.05, 1.2]} pos={[1.35, 2.78, -0.1]} mat="steel" r={0.01} />
      <GlassBox c={[1.35, 3.3, -0.1]} s={[1.2, 0.95, 1.1]} />

      <GlassBox c={[0.8, 0.5, -0.1]} s={[1.3, 0.9, 1.1]} />

      {/* 無垢のガラスブロック */}
      <RBox size={[0.7, 0.05, 0.55]} pos={[0.0, 4.33, -0.7]} mat="steel" r={0.01} />
      <SolidCube c={[0.0, 4.55, -0.7]} s={[0.5, 0.4, 0.4]} />
      <RBox size={[0.7, 0.05, 0.55]} pos={[-0.9, 3.15, 0.9]} mat="steel" r={0.01} />
      <SolidCube c={[-0.9, 3.37, 0.9]} s={[0.55, 0.4, 0.4]} />
      <RBox size={[0.7, 0.05, 0.55]} pos={[2.4, 2.22, 1.1]} mat="steel" r={0.01} />
      <SolidCube c={[2.4, 2.44, 1.1]} s={[0.5, 0.4, 0.4]} />

      <Moss patches={MOSS} />
      <Ivy still={still} />
    </group>
  );
}

/* ---------- ステージ(光・床・カメラ) ---------- */
function Stage({ dark, still }: { dark: Dark; still: boolean }) {
  const { gl, scene, camera, size, invalidate } = useThree();
  const mats = useMemo(() => makeMaterials(dark), [dark]);
  const target = useMemo(() => new THREE.Vector3(0.1, 2.6, 0.2), []);
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl]);
  const contact = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)');
    gr.addColorStop(0.55, 'rgba(0,0,0,0.22)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);

  useEffect(() => {
    controls.target.copy(target);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.7;
    controls.minPolarAngle = THREE.MathUtils.degToRad(66);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(93);
    gl.domElement.style.touchAction = 'pan-y';
    const on = () => invalidate();
    controls.addEventListener('change', on);
    return () => {
      controls.removeEventListener('change', on);
      controls.dispose();
    };
  }, [controls, gl, target, invalidate]);

  // 参考画像に近い、少し上からの斜め正面。画面に全体が収まる距離を毎回求める
  const placed = useRef(false);
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const tan = Math.tan(THREE.MathUtils.degToRad(persp.fov / 2));
    const need = Math.max((3.55 * 1.14) / tan, (4.0 * 1.1) / (tan * aspect));
    if (!placed.current) {
      const az = THREE.MathUtils.degToRad(-22);
      const el = THREE.MathUtils.degToRad(12);
      camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(need).add(target);
      placed.current = true;
    } else {
      camera.position.sub(target).setLength(need).add(target);
    }
    controls.update();
    invalidate();
  }, [camera, size.width, size.height, target, controls, invalidate]);

  useEffect(() => {
    gl.toneMapping = THREE.NeutralToneMapping;
    const env = studio(gl, dark);
    scene.environment = env;
    scene.background = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#e4e5e6');
    invalidate();
    return () => {
      env.dispose();
      scene.environment = null;
    };
  }, [gl, scene, dark, invalidate]);

  useEffect(
    () => () => {
      (['concrete', 'frame', 'steel', 'glass', 'solid', 'stem', 'leaf', 'moss', 'edge', 'engrave'] as const).forEach((k) => mats[k].dispose());
      mats.textures.map.dispose();
      mats.textures.bump.dispose();
      mats.engrave.map?.dispose();
    },
    [mats],
  );

  useFrame(() => controls.update());

  return (
    <MatCtx.Provider value={mats}>
      <directionalLight
        castShadow={!dark}
        position={[-9, 15, 10]}
        intensity={dark ? 0.6 : 1.2}
        shadow-mapSize={[2560, 2560]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-near={2}
        shadow-camera-far={60}
        shadow-radius={9}
        shadow-blurSamples={28}
        shadow-bias={-0.0004}
      />
      <Sculpture still={still} />
      {/* 接地影 */}
      <mesh rotation-x={-Math.PI / 2} position={[0.1, -0.338, 0]}>
        <planeGeometry args={[9.4, 7.4]} />
        <meshBasicMaterial map={contact} transparent opacity={dark ? 0 : 0.55} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.34} receiveShadow>
        <planeGeometry args={[44, 44]} />
        <shadowMaterial transparent opacity={dark ? 0 : 0.14} />
      </mesh>
    </MatCtx.Provider>
  );
}

export default function Scene() {
  const dark = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ok, setOk] = useState(true);
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
    <div ref={host} className="scene" data-cursor="ドラッグ" aria-hidden="true">
      {ok && (
        <Canvas
          shadows="variance"
          dpr={[1, 2]}
          camera={{ position: [-4, 5, 20], fov: 24, near: 0.5, far: 200 }}
          frameloop={visible && !still ? 'always' : 'demand'}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <Stage dark={dark} still={still} />
        </Canvas>
      )}
    </div>
  );
}
