import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { MotionCues } from "./tapMotionModel";
import {
  type MotionScene, type Move, type XYZ, canvasTexture, clamp, createCamera, createStudio,
  blurredDraw, expoInOut, inOut, lerp, mix, out, poseSpeed, poseTrack, shadowed, span, standard,
} from "./motion/core";

export { WIDTH, HEIGHT, inOut, out } from "./motion/core";

function cardFace() {
  return canvasTexture(1024, 646, (ctx) => {
    const fill = ctx.createLinearGradient(0, 0, 1024, 646);
    fill.addColorStop(0, "#1f6b5c"); fill.addColorStop(.55, "#164a46"); fill.addColorStop(1, "#0f3133");
    ctx.fillStyle = fill; ctx.fillRect(0, 0, 1024, 646);
    ctx.globalAlpha = .16; ctx.strokeStyle = "#e9f6dd"; ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      ctx.beginPath(); ctx.moveTo(380 + i * 34, 646); ctx.bezierCurveTo(560 + i * 20, 420, 640 + i * 18, 220, 1024, 40 + i * 22); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#e4f1e2"; ctx.font = "700 40px 'Space Grotesk', sans-serif"; ctx.letterSpacing = "6px";
    ctx.fillText("EVERYDAY CARD", 70, 100);
    ctx.strokeStyle = "#f2f6ea"; ctx.lineWidth = 11; ctx.lineCap = "round";
    for (const r of [34, 62, 90]) { ctx.beginPath(); ctx.arc(820, 300, r, -.75, .75); ctx.stroke(); }
    ctx.font = "500 56px 'Space Grotesk', sans-serif"; ctx.letterSpacing = "10px"; ctx.fillStyle = "#f5f7ee";
    ctx.fillText("•••• •••• •••• 2048", 70, 500);
    ctx.font = "500 24px Inter, sans-serif"; ctx.letterSpacing = "4px"; ctx.fillStyle = "#b7d4c7";
    ctx.fillText("ILLUSTRATIVE CARD · NOT REAL DETAILS", 72, 575);
  }).texture;
}

interface Screen { mode: "tap" | "busy" | "paid" | "welcome" | "amount" | "hold"; amount: string; spin: number; pulse: number }

function drawScreen(ctx: CanvasRenderingContext2D, s: Screen) {
  const paid = s.mode === "paid";
  ctx.fillStyle = paid ? "#d2f0db" : "#f4f1e1"; ctx.fillRect(0, 0, 640, 520);
  ctx.textAlign = "center"; ctx.fillStyle = "#5d6e67"; ctx.font = "600 34px Inter, sans-serif"; ctx.letterSpacing = "6px";
  ctx.fillText(paid ? "PAYMENT" : s.mode === "welcome" ? "NEW SALE" : "COFFEE", 320, 82);
  if (paid || s.mode === "busy") {
    ctx.lineWidth = 22; ctx.lineCap = "round";
    if (paid) {
      ctx.fillStyle = "#2f8b6d"; ctx.beginPath(); ctx.arc(320, 262, 118, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#f4fff6"; ctx.beginPath(); ctx.moveTo(262, 266); ctx.lineTo(304, 308); ctx.lineTo(384, 222); ctx.stroke();
      ctx.fillStyle = "#24785e"; ctx.font = "700 46px 'Space Grotesk', sans-serif"; ctx.letterSpacing = "3px"; ctx.fillText("APPROVED", 320, 456);
    } else {
      ctx.strokeStyle = "#d7d4c4"; ctx.beginPath(); ctx.arc(320, 262, 96, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#cd5137"; ctx.beginPath(); ctx.arc(320, 262, 96, s.spin, s.spin + 1.8); ctx.stroke();
    }
    return;
  }
  ctx.fillStyle = "#1f2c2f"; ctx.font = "700 150px 'Space Grotesk', sans-serif"; ctx.letterSpacing = "-4px";
  ctx.fillText(s.amount, 320, 272);
  ctx.font = "600 36px Inter, sans-serif"; ctx.letterSpacing = "4px"; ctx.fillStyle = s.mode === "welcome" ? "#8a8f84" : "#cd5137";
  ctx.fillText(s.mode === "welcome" ? "ENTER AMOUNT" : s.mode === "amount" ? "CHECK AMOUNT" : "HOLD CARD NEAR", 320, 370);
  if (s.mode === "hold" || s.mode === "tap") {
    ctx.strokeStyle = "#247b69"; ctx.lineWidth = 10; ctx.lineCap = "round";
    for (const [i, r] of [22, 42, 62].entries()) {
      ctx.globalAlpha = .35 + .65 * clamp(Math.sin(s.pulse * 5 - i * .9) * .5 + .5);
      ctx.beginPath(); ctx.arc(280, 450, r, -.7, .7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function terminal() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.5, 4.3, .62, 6, .26), standard(0x23343a, .38, .25));
  body.position.y = 2.15;
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(2.18, 1.82, .08, 4, .1), standard(0x111b1f, .25, .2));
  bezel.position.set(0, 3.12, .31);
  const screenCanvas = canvasTexture(640, 520, () => undefined);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.62),
    new THREE.MeshStandardMaterial({ map: screenCanvas.texture, emissive: 0xffffff, emissiveMap: screenCanvas.texture, emissiveIntensity: .55, roughness: .3 }));
  screen.position.set(0, 3.12, .356);
  group.add(body, bezel, screen);
  const keys: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const color = i === 11 ? 0x6fb68c : i === 9 ? 0xcd6650 : 0xe8e3d4;
    const key = new THREE.Mesh(new RoundedBoxGeometry(.5, .27, .12, 3, .06), standard(color, .45));
    key.position.set(-.62 + (i % 3) * .62, 1.86 - Math.floor(i / 3) * .4, .33);
    keys.push(key); group.add(key);
  }
  const base = new THREE.Mesh(new RoundedBoxGeometry(2.7, .22, 1.3, 4, .1), standard(0x182429, .5, .2));
  base.position.set(0, .11, -.1);
  group.add(base);
  return { group: shadowed(group), keys, screen, screenCanvas };
}

function cup() {
  const group = new THREE.Group();
  const profile = [new THREE.Vector2(0, 0), new THREE.Vector2(.72, 0), new THREE.Vector2(.76, .08), new THREE.Vector2(1.0, 2.55), new THREE.Vector2(.96, 2.6), new THREE.Vector2(0, 2.6)];
  const paper = canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = "#f7f1e6"; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#cf673f"; ctx.fillRect(0, 96, 512, 104);
    ctx.fillStyle = "#fff4df"; ctx.font = "700 46px 'Space Grotesk', sans-serif"; ctx.textAlign = "center"; ctx.letterSpacing = "8px";
    ctx.fillText("COFFEE", 128, 166); ctx.fillText("COFFEE", 384, 166);
  }).texture;
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), new THREE.MeshStandardMaterial({ map: paper, roughness: .7 }));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.04, .22, 64), standard(0x24332f, .45));
  lid.position.y = 2.68;
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(.82, 1.0, .2, 64), standard(0x2e403a, .45));
  dome.position.y = 2.88;
  const sip = new THREE.Mesh(new RoundedBoxGeometry(.4, .06, .14, 2, .03), standard(0x111a17, .6));
  sip.position.set(0, 2.99, .55);
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.3, .1, 64), standard(0xe9e1cf, .55));
  saucer.position.y = .05;
  group.add(body, lid, dome, sip, saucer);
  return shadowed(group);
}

function card(face: THREE.Texture) {
  const group = new THREE.Group();
  const edge = new THREE.MeshPhysicalMaterial({ color: 0x184c45, roughness: .35, clearcoat: .8, transparent: true });
  const front = new THREE.MeshPhysicalMaterial({ map: face, roughness: .28, clearcoat: 1, clearcoatRoughness: .2, transparent: true });
  const back = new THREE.MeshPhysicalMaterial({ color: 0x173e3c, roughness: .4, transparent: true });
  const shell = new THREE.Mesh(new RoundedBoxGeometry(3.4, 2.14, .045, 4, .02), [edge, edge, edge, edge, front, back]);
  // Box UVs are per face; the front face gets the full card artwork.
  group.add(shell);
  const chip = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b45c, metalness: .85, roughness: .28, emissive: 0x000000 });
  const chipBase = new THREE.Mesh(new RoundedBoxGeometry(.5, .4, .02, 2, .05), gold);
  chip.add(chipBase);
  for (const y of [-.08, .08]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(.5, .012, .022), standard(0x9b7a3a, .4, .6)); line.position.y = y; chip.add(line);
  }
  chip.position.set(-.95, .1, .028);
  group.add(chip);
  const path = new THREE.CurvePath<THREE.Vector3>();
  let previous: THREE.Vector3 | undefined;
  for (let loop = 0; loop < 4; loop++) {
    const w = 1.5 - loop * .1, h = .92 - loop * .1;
    for (const [x, y] of [[-w, -h], [w, -h], [w, h], [-w + .1, h], [-w + .1, -h + .1]] as [number, number][]) {
      const point = new THREE.Vector3(x, y, 0);
      if (previous) path.add(new THREE.LineCurve3(previous, point));
      previous = point;
    }
  }
  const copper = new THREE.MeshStandardMaterial({ color: 0xd6874a, emissive: 0xff9d4d, emissiveIntensity: 0, metalness: .6, roughness: .3, transparent: true, opacity: 0 });
  const coil = new THREE.Mesh(new THREE.TubeGeometry(path, 400, .016, 6, false), copper);
  group.add(coil);
  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new RoundedBoxGeometry(3.4, 2.14, .045, 4, .02), 30),
    new THREE.LineBasicMaterial({ color: 0x9ff3d9, transparent: true, opacity: 0 }));
  shadowed(group).add(outline);
  return { group, shell, front, edge, back, coil, copper, gold, outline };
}

function ring(color: number) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(.96, 1, 96),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  return mesh;
}

export type { MotionScene };

export function createMotionScene(output: HTMLCanvasElement, cues: MotionCues): MotionScene {
  const studio = createStudio(output);
  const { scene } = studio;
  const glow = new THREE.PointLight(0xff9d4d, 0, 9, 1.6);
  scene.add(glow);

  const pos = terminal();
  pos.group.position.set(1.35, 0, 0);
  pos.group.rotation.set(0, -.32, 0);
  scene.add(pos.group);
  const coffee = cup();
  coffee.position.set(-2.35, 0, .55);
  scene.add(coffee);
  const plastic = card(cardFace());
  scene.add(plastic.group);

  scene.updateMatrixWorld(true);
  const screenCenter = pos.screen.getWorldPosition(new THREE.Vector3());
  const screenNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(pos.group.quaternion);
  const anchor = (distance: number): XYZ => screenCenter.clone().addScaledVector(screenNormal, distance).toArray() as XYZ;
  const lidTop = new THREE.Vector3(-2.35, 2.98, .55);

  const waves = [0, 1, 2].map(() => ring(0x2f8b6d));
  const burst = ring(0xcd5137);
  for (const wave of [...waves, burst]) {
    wave.position.copy(screenCenter).addScaledVector(screenNormal, .08);
    wave.quaternion.copy(pos.group.quaternion);
    scene.add(wave);
  }
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(3.8, .05),
    new THREE.MeshBasicMaterial({ color: 0x9ff3d9, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  plastic.group.add(scan);
  scan.position.z = .05;

  const { camera, shot } = createCamera();
  const hero: XYZ = [0, 3.1, 2.4];
  const screenAt = screenCenter.toArray() as XYZ;
  const normal = screenNormal.toArray() as XYZ;
  const moves: Move[] = [
    [0, 0, shot(hero, [0, .06, 1], 6.4)],
    [0, cues.tap, shot(hero, [-.04, .05, 1], 5.3), (n) => n],
    [cues.tap, cues.tap + .36, shot([1.0, 2.9, .9], [.3, .22, 1], 6.6), expoInOut],
    [cues.tap + .36, cues.coffee, shot([1.05, 2.95, .8], [.27, .2, 1], 6.0), (n) => n],
    [cues.coffee, cues.cut, shot(screenAt, normal, 1.9), (n) => n ** 3],
    [cues.cut, cues.cut, shot(lidTop.toArray() as XYZ, [0, 1, .01], 2.5)],
    [cues.cut + .05, cues.cut + 1.35, shot([-.45, 1.75, .4], [.05, .36, 1], 9.0), inOut],
    [cues.cut + 1.35, cues.cashier, shot([-.4, 1.75, .4], [.1, .34, 1], 8.5), (n) => n],
    [cues.cashier, cues.cashier + .65, shot([1.25, 2.55, .3], [.5, .28, 1], 4.4), inOut],
    [cues.cashier + .65, cues.approach, shot([1.3, 2.6, .3], [.42, .26, 1], 4.0), (n) => n],
    [cues.approach, cues.approach + .75, shot([.45, 2.45, 1.7], [-.6, .2, 1], 6.8), inOut],
    [cues.approach + .75, cues.inside, shot([.6, 2.55, 1.4], [-.48, .16, 1], 5.9), (n) => n],
    [cues.inside, cues.inside + .8, shot([-.15, 2.8, 3.1], [.04, .03, 1], 4.9), inOut],
    [cues.inside + .8, cues.end, shot([-.15, 2.8, 3.1], [.14, .05, 1], 4.4), (n) => n],
  ];

  const pose = poseTrack(moves);

  const termFacing = new THREE.Euler(0, -.32, 0);
  const near = anchor(.32), retreat = anchor(.62), hover = anchor(.95);
  const tableRest: XYZ = [-.05, .035, 2.6];
  const hand: XYZ = [-.25, 2.35, 3.9];
  const closeUp: XYZ = [-.15, 2.8, 3.1];

  function cardState(t: number): { p: XYZ; r: XYZ } {
    const bob = Math.sin(t * 2.1) * .035;
    if (t < cues.tap) {
      const spin = out(span(t, 0, 1.0));
      return { p: [hero[0], hero[1] + bob + (1 - spin) * -.6, hero[2]], r: [-.1, lerp(-1.6, .2, spin), .06 + lerp(.4, 0, spin)] };
    }
    if (t < cues.hit) {
      const n = inOut(span(t, cues.tap, cues.hit - cues.tap));
      const arc = mix(mix(hero, [1.4, 4.4, 2.6], n), mix([1.4, 4.4, 2.6], near, n), n);
      return { p: arc, r: [lerp(-.1, termFacing.x, n), lerp(.2, termFacing.y, n), lerp(.06, -.12, n)] };
    }
    if (t < cues.cut) {
      const n = out(span(t, cues.hit, .3));
      return { p: mix(near, retreat, n), r: [termFacing.x, termFacing.y, -.12 + n * .06] };
    }
    if (t < cues.approach + .1) return { p: tableRest, r: [-Math.PI / 2, 0, .28] };
    if (t < cues.approach + 1.35) {
      const n = inOut(span(t, cues.approach + .1, 1.0));
      const lift: XYZ = [lerp(tableRest[0], hand[0], n), lerp(tableRest[1], hand[1], n) + Math.sin(n * Math.PI) * .6, lerp(tableRest[2], hand[2], n)];
      return { p: lift, r: [lerp(-Math.PI / 2, -.08, n), lerp(0, termFacing.y - .1, n), lerp(.28, -.08, n)] };
    }
    if (t < cues.inside) {
      const n = inOut(span(t, cues.approach + 1.35, cues.inside - cues.approach - 1.45));
      return { p: mix(hand, hover, n).map((v, i) => v + (i === 1 ? bob * .6 : 0)) as XYZ, r: [-.08, lerp(termFacing.y - .1, termFacing.y, n), -.08] };
    }
    const n = inOut(span(t, cues.inside, .85));
    const drift = Math.sin((t - cues.inside) * .9) * .12;
    return { p: mix(hover, closeUp, n), r: [lerp(-.08, .06, n), lerp(termFacing.y, drift, n), lerp(-.08, 0, n)] };
  }

  function screenState(t: number): Screen {
    const base = { spin: t * 9, pulse: t, amount: "₹200" };
    if (t < cues.hit) return { ...base, mode: "tap" };
    if (t < cues.hit + .34) return { ...base, mode: "busy" };
    if (t < cues.cut) return { ...base, mode: "paid" };
    if (t < cues.cashier + .3) return { ...base, mode: "welcome", amount: "₹0" };
    if (t < cues.approach + .9) return { ...base, mode: "amount", amount: t < cues.cashier + .6 ? "₹2" : t < cues.cashier + .9 ? "₹20" : "₹200" };
    return { ...base, mode: "hold" };
  }

  let lastScreen = "";
  function apply(t: number) {
    const state = cardState(t);
    plastic.group.position.set(...state.p);
    plastic.group.rotation.set(...state.r);
    const screen = screenState(t);
    const signature = JSON.stringify({ ...screen, spin: screen.mode === "busy" ? Math.round(screen.spin * 10) : 0, pulse: ["hold", "tap"].includes(screen.mode) ? Math.round(screen.pulse * 30) : 0 });
    if (signature !== lastScreen) { drawScreen(pos.screenCanvas.ctx, screen); pos.screenCanvas.texture.needsUpdate = true; lastScreen = signature; }
    pos.keys.forEach((keyMesh, index) => {
      const presses = [[1, cues.cashier + .3], [10, cues.cashier + .6], [10, cues.cashier + .9]] as const;
      const press = presses.reduce((depth, [k, at]) => k === index ? Math.max(depth, Math.sin(Math.PI * span(t, at - .06, .18))) : depth, 0);
      keyMesh.position.z = .33 - press * .06;
    });

    const fieldOn = (t > cues.tap + .3 && t < cues.hit + .1) || (t > cues.approach + 1.4 && t < cues.inside + .4);
    waves.forEach((wave, index) => {
      const phase = ((t * .85 + index / 3) % 1);
      wave.scale.setScalar(.55 + phase * 2.6);
      (wave.material as THREE.MeshBasicMaterial).opacity = fieldOn ? (1 - phase) * .55 : 0;
    });
    const b = span(t, cues.hit, .55);
    burst.scale.setScalar(.4 + out(b) * 4.2);
    (burst.material as THREE.MeshBasicMaterial).opacity = t >= cues.hit && b < 1 ? (1 - b) * .9 : 0;

    const xray = inOut(span(t, cues.inside + .25, .75));
    const dark = inOut(span(t, cues.inside + .05, .9));
    studio.mood(dark);
    plastic.front.opacity = 1 - xray * .62; plastic.back.opacity = 1 - xray * .8; plastic.edge.opacity = 1 - xray * .4;
    (plastic.outline.material as THREE.LineBasicMaterial).opacity = xray * .9;
    plastic.copper.opacity = xray; plastic.copper.emissiveIntensity = xray * (1.4 + Math.sin(t * 6) * .25);
    plastic.gold.emissive.setRGB(xray * .5, xray * .32, xray * .08);
    glow.position.copy(plastic.group.position).add(new THREE.Vector3(0, 0, .8));
    glow.intensity = xray * 9;
    const sweep = span(t, cues.inside + .3, 1.1);
    scan.position.y = lerp(-1.2, 1.2, sweep);
    (scan.material as THREE.MeshBasicMaterial).opacity = sweep > 0 && sweep < 1 ? .85 : 0;
    pos.group.visible = true;

    const view = pose(t);
    const shake = t > cues.hit && t < cues.hit + .28 ? Math.exp(-(t - cues.hit) * 18) * .07 : 0;
    camera.position.set(view.p[0] + Math.sin(t * 91) * shake, view.p[1] + Math.cos(t * 77) * shake, view.p[2]);
    camera.lookAt(...view.l);
    camera.fov = view.fov; camera.updateProjectionMatrix();
  }

  function speed(t: number): number {
    const c = cardState(t), e = cardState(t + 1 / 30);
    return poseSpeed(pose(t), pose(t + 1 / 30)) + Math.hypot(...c.p.map((v, i) => v - e.p[i])) * .6;
  }

  return {
    draw: (t) => blurredDraw(studio, camera, t, speed(t), apply),
    dispose: studio.dispose,
  };
}
