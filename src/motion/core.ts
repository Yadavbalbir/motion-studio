import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type XYZ = [number, number, number];
export interface Pose { p: XYZ; l: XYZ; fov: number }
export type Move = [start: number, end: number, pose: Pose, ease?: (n: number) => number];
export interface MotionScene { draw: (t: number) => void; dispose: () => void }

export const WIDTH = 1080, HEIGHT = 1920;
export const clamp = (n: number) => Math.min(1, Math.max(0, n));
export const lerp = (a: number, b: number, n: number) => a + (b - a) * n;
export const mix = (a: XYZ, b: XYZ, n: number): XYZ => [lerp(a[0], b[0], n), lerp(a[1], b[1], n), lerp(a[2], b[2], n)];
export const inOut = (n: number) => { const t = clamp(n); return t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; };
export const out = (n: number) => 1 - (1 - clamp(n)) ** 3;
export const expoInOut = (n: number) => { const t = clamp(n); return t === 0 || t === 1 ? t : t < .5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2; };
export const span = (t: number, start: number, length: number) => clamp((t - start) / length);
export const linear = (n: number) => n;

export const cream = new THREE.Color(0xf3ead9), night = new THREE.Color(0x0f2427);

export function standard(color: number, roughness = .5, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function shadowed<T extends THREE.Object3D>(object: T): T {
  object.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
  return object;
}

export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable for motion textures.");
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, canvas, ctx };
}

export function seeded(seed: number) {
  let value = seed;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 0xffffffff; };
}

export function paperTexture(base: string, speck: string, seed: number) {
  return canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, 1024, 1024);
    const random = seeded(seed);
    for (let i = 0; i < 26000; i++) {
      ctx.fillStyle = speck; ctx.globalAlpha = random() * .08;
      ctx.fillRect(random() * 1024, random() * 1024, 1 + random() * 2, 1 + random() * 2);
    }
    ctx.globalAlpha = .05;
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = speck; ctx.lineWidth = .6 + random();
      ctx.beginPath(); const y = random() * 1024; ctx.moveTo(0, y); ctx.bezierCurveTo(300, y + random() * 30 - 15, 700, y + random() * 30 - 15, 1024, y);
      ctx.stroke();
    }
  }).texture;
}

/** Shared paper studio: renderer, lights, table and wall, with a cream-to-night mood control. */
export function createStudio(output: HTMLCanvasElement) {
  const gl = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const out2d = output.getContext("2d");
  if (!out2d) throw new Error("Motion output canvas is unavailable.");

  const scene = new THREE.Scene();
  scene.background = cream.clone();
  scene.fog = new THREE.Fog(cream.clone(), 28, 70);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04).texture;
  scene.environment = environment;
  scene.environmentIntensity = .55;

  const hemi = new THREE.HemisphereLight(0xfff4e2, 0x9c8a6c, 1.3);
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6);
  key.position.set(-6, 11, 9); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -.0004;
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  const rim = new THREE.DirectionalLight(0xffc49a, 1.4); rim.position.set(7, 6, -6);
  scene.add(hemi, key, rim);

  const tableMaterial = new THREE.MeshStandardMaterial({ map: paperTexture("#e8dcc4", "#6b5232", 7), roughness: .85 });
  (tableMaterial.map as THREE.Texture).wrapS = (tableMaterial.map as THREE.Texture).wrapT = THREE.RepeatWrapping;
  (tableMaterial.map as THREE.Texture).repeat.set(3, 3);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), tableMaterial);
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true;
  const wallMaterial = new THREE.MeshStandardMaterial({ map: paperTexture("#f1e7d4", "#7a6040", 11), roughness: .95 });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), wallMaterial);
  wall.position.set(0, 14, -7); wall.receiveShadow = true;
  scene.add(table, wall);

  /** 0 = cream daylight, 1 = night. */
  function mood(dark: number) {
    (scene.background as THREE.Color).copy(cream).lerp(night, dark);
    (scene.fog as THREE.Fog).color.copy(cream).lerp(night, dark);
    tableMaterial.color.setScalar(1 - dark * .78); wallMaterial.color.setScalar(1 - dark * .82);
    hemi.intensity = 1.3 - dark * .9; key.intensity = 2.6 - dark * 1.6;
    scene.environmentIntensity = .55 - dark * .3;
  }

  function dispose() {
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    });
    room.dispose(); environment.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
  }

  return { gl, renderer, out2d, scene, hemi, key, rim, tableMaterial, wallMaterial, mood, dispose };
}
export type Studio = ReturnType<typeof createStudio>;

export function createCamera(fov = 46) {
  const camera = new THREE.PerspectiveCamera(fov, WIDTH / HEIGHT, .05, 160);
  const halfWidth = (f: number) => Math.tan(THREE.MathUtils.degToRad(f) / 2) * WIDTH / HEIGHT;
  // Frame a target by the world width visible across the vertical canvas; nudge it below centre for the type zone.
  const shot = (target: XYZ, direction: XYZ, width: number, f = fov): Pose => {
    const dir = new THREE.Vector3(...direction).normalize();
    const distance = width / 2 / halfWidth(f);
    const lift = distance * Math.tan(THREE.MathUtils.degToRad(f) / 2) * .1;
    const p = new THREE.Vector3(...target).addScaledVector(dir, distance);
    return { p: p.toArray() as XYZ, l: [target[0], target[1] + lift, target[2]], fov: f };
  };
  return { camera, shot };
}

/** Camera track from [start, end, pose, ease] moves; `start === end` is a hard cut. */
export function poseTrack(moves: Move[]) {
  return (t: number): Pose => {
    let current = moves[0][2];
    for (const [start, end, target, ease = inOut] of moves) {
      if (t >= end) { current = target; continue; }
      if (t > start) {
        const n = ease((t - start) / (end - start));
        current = { p: mix(current.p, target.p, n), l: mix(current.l, target.l, n), fov: lerp(current.fov, target.fov, n) };
      }
      break;
    }
    return current;
  };
}

export const poseSpeed = (a: Pose, b: Pose) =>
  Math.hypot(...a.p.map((v, i) => v - b.p[i])) + Math.hypot(...a.l.map((v, i) => v - b.l[i])) * .5;

/** Deterministic 180-degree shutter: average sub-frames only while motion is fast. */
export function blurredDraw(studio: Studio, camera: THREE.Camera, t: number, speed: number, apply: (t: number) => void) {
  const { renderer, out2d, scene, gl } = studio;
  if (renderer.getContext().isContextLost()) throw new Error("Motion WebGL renderer is unavailable.");
  const samples = speed > .16 ? 6 : speed > .06 ? 3 : 1;
  out2d.globalCompositeOperation = "source-over";
  for (let i = 0; i < samples; i++) {
    apply(t - (samples === 1 ? 0 : (i / (samples - 1)) / 60));
    renderer.render(scene, camera);
    out2d.globalAlpha = 1 / (i + 1);
    out2d.drawImage(gl, 0, 0, WIDTH, HEIGHT);
  }
  out2d.globalAlpha = 1;
}
