import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  type MotionScene, type Move, type XYZ, canvasTexture, clamp, createCamera, createStudio, blurredDraw,
  expoInOut, inOut, lerp, linear, mix, out, poseSpeed, poseTrack, shadowed, span, standard,
} from "./motion/core";
import type { SqlCues } from "./sqlMotionModel";

const INK = "#1f2c31", TEAL = "#247b69", ORANGE = "#cd5137", CREAM = "#f6efe1";
const SQL_X = -5.9, DOC_X = 0, KV_X = 6.1, PHONE: XYZ = [0, 0, 4.6];
const MAP_ROUTE: [number, number][] = [[-1.5, 1.3], [-1.5, .1], [-.3, .1], [-.3, -1.0], [1.2, -1.0], [1.2, -1.3]];
const rise = (n: number) => 1 + 2.4 * (n - 1) ** 3 + 1.4 * (n - 1) ** 2;

function textPlate(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, px = 256) {
  const w = Math.round(width * px), h = Math.round(height * px);
  return canvasTexture(w, h, (ctx) => draw(ctx, w, h));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, font: (size: number) => string, size: number, max: number) {
  let s = size;
  ctx.font = font(s);
  while (ctx.measureText(text).width > max && s > 10) { s -= 2; ctx.font = font(s); }
}

/** A standing table board: header with column names, existing rows, and one new-row slot. */
function board(title: string, columns: string[], rows: string[][], fresh: string[], width: number) {
  const group = new THREE.Group();
  const rowH = .44, gap = .1, headH = .78, pad = .2;
  const height = headH + (rows.length + 1) * (rowH + gap) + pad * 1.6;
  const panel = new THREE.Mesh(new RoundedBoxGeometry(width, height, .14, 4, .07), standard(0x1f2c31, .45, .15));
  const bottom = .7;
  panel.position.y = bottom + height / 2;
  const stand = new THREE.Mesh(new RoundedBoxGeometry(width * .5, .12, .9, 3, .05), standard(0x182429, .5, .2));
  stand.position.y = .06;
  const post = new THREE.Mesh(new RoundedBoxGeometry(.22, bottom, .22, 3, .06), standard(0x182429, .5, .2));
  post.position.y = bottom / 2;
  group.add(stand, post, panel);
  const top = bottom + height - pad;
  const colX = (ctx: CanvasRenderingContext2D, w: number, i: number) => 28 + i * (w - 40) / columns.length;
  const header = textPlate(width - .24, headH, (ctx, w, h) => {
    ctx.fillStyle = "#2a3c42"; roundRect(ctx, 0, 0, w, h, 26); ctx.fill();
    ctx.fillStyle = "#9ff3d9"; ctx.font = "700 62px 'Space Grotesk', sans-serif"; ctx.fillText(title, 28, 74);
    ctx.fillStyle = "#c9d6d2"; ctx.font = "600 40px Inter, sans-serif";
    columns.forEach((name, i) => ctx.fillText(name, colX(ctx, w, i), h - 30));
  });
  const headMat = new THREE.MeshStandardMaterial({ map: header.texture, roughness: .6, emissive: 0x2fbf9a, emissiveIntensity: 0 });
  const head = new THREE.Mesh(new RoundedBoxGeometry(width - .24, headH, .05, 3, .02), headMat);
  head.position.set(0, top - headH / 2, .1);
  group.add(head);
  const rowMesh = (cells: string[], highlight: boolean) => {
    const tex = textPlate(width - .24, rowH, (ctx, w, h) => {
      ctx.fillStyle = highlight ? "#fff7e6" : CREAM; roundRect(ctx, 0, 0, w, h, 22); ctx.fill();
      ctx.fillStyle = INK; ctx.font = "600 46px Inter, sans-serif";
      cells.forEach((cell, i) => ctx.fillText(cell, colX(ctx, w, i), h / 2 + 16));
    });
    const material = new THREE.MeshStandardMaterial({ map: tex.texture, roughness: .55, transparent: true, emissive: 0x000000 });
    return new THREE.Mesh(new RoundedBoxGeometry(width - .24, rowH, .06, 3, .025), material);
  };
  const rowY = (i: number) => top - headH - gap - rowH / 2 - i * (rowH + gap);
  const existing = rows.map((cells, i) => {
    const mesh = rowMesh(cells, false);
    mesh.position.set(0, rowY(i), .11);
    group.add(mesh);
    return mesh;
  });
  const newRow = rowMesh(fresh, true);
  newRow.position.set(0, rowY(rows.length), .11);
  group.add(newRow);
  return { group: shadowed(group), existing, newRow, newY: rowY(rows.length), headMat, height, bottom, rowY };
}

function menuDoc(kind: "pizza" | "biryani" | "lassi", lines: [string, string][], height: number) {
  const width = 1.5;
  const tex = textPlate(width, height, (ctx, w, h) => {
    ctx.fillStyle = CREAM; roundRect(ctx, 0, 0, w, h, 40); ctx.fill();
    const art = 150;
    ctx.fillStyle = kind === "pizza" ? "#f2c46d" : kind === "biryani" ? "#e9a54b" : "#f4f1e6";
    ctx.save(); ctx.translate(w / 2, 110);
    if (kind === "pizza") {
      ctx.beginPath(); ctx.arc(0, 0, art * .55, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#c9842f"; ctx.lineWidth = 12; ctx.stroke();
      ctx.fillStyle = ORANGE; for (const [x, y] of [[-30, -25], [32, -10], [-8, 34], [26, 34], [-40, 18]]) { ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = "#c9842f"; ctx.lineWidth = 4; for (let a = 0; a < 3; a++) { ctx.beginPath(); ctx.moveTo(-Math.cos(a) * 82, -Math.sin(a) * 82); ctx.lineTo(Math.cos(a) * 82, Math.sin(a) * 82); ctx.stroke(); }
    } else if (kind === "biryani") {
      ctx.fillStyle = "#e9a54b"; ctx.beginPath(); ctx.ellipse(0, -8, 82, 42, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#fff3d6"; for (let i = 0; i < 26; i++) ctx.fillRect(-70 + (i * 37) % 140, -40 + (i * 17) % 30, 12, 5);
      ctx.fillStyle = TEAL; ctx.beginPath(); ctx.moveTo(-92, -6); ctx.lineTo(92, -6); ctx.quadraticCurveTo(80, 70, 0, 72); ctx.quadraticCurveTo(-80, 70, -92, -6); ctx.fill();
      ctx.fillStyle = ORANGE; for (const x of [-30, 0, 30]) { ctx.beginPath(); ctx.ellipse(x, 30, 9, 16, .5, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.fillStyle = "#e8e2cf"; ctx.beginPath(); ctx.moveTo(-50, -70); ctx.lineTo(50, -70); ctx.lineTo(38, 70); ctx.lineTo(-38, 70); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.stroke(); ctx.fillStyle = "#fffaf0"; ctx.fillRect(-44, -40, 88, 20);
    }
    ctx.restore();
    ctx.font = "700 44px 'Space Grotesk', monospace"; ctx.fillStyle = "#8a7a5c"; ctx.fillText("{", 26, 270);
    lines.forEach(([k, v], i) => {
      const y = 330 + i * 62;
      ctx.font = "600 38px 'Space Grotesk', monospace"; ctx.fillStyle = TEAL; ctx.fillText(`${k}:`, 52, y);
      const kw = ctx.measureText(`${k}: `).width;
      fitText(ctx, v, (s) => `600 ${s}px 'Space Grotesk', monospace`, 38, w - 70 - kw);
      ctx.fillStyle = ORANGE; ctx.fillText(v, 52 + kw, y);
    });
    ctx.font = "700 44px 'Space Grotesk', monospace"; ctx.fillStyle = "#8a7a5c"; ctx.fillText("}", 26, 330 + lines.length * 62);
  });
  const material = new THREE.MeshStandardMaterial({ map: tex.texture, roughness: .6 });
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, .06, 3, .03), material);
  const group = new THREE.Group();
  mesh.position.y = height / 2;
  group.add(mesh);
  return shadowed(group);
}

function phone() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.7, 3.4, .16, 6, .2), standard(0x1c2529, .35, .3));
  body.position.y = 1.85;
  const draw = (mode: "order" | "comment") => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = CREAM; roundRect(ctx, 0, 0, w, h, 60); ctx.fill();
    ctx.fillStyle = ORANGE; roundRect(ctx, 0, 0, w, 170, 60); ctx.fill(); ctx.fillRect(0, 100, w, 70);
    ctx.fillStyle = "#fff"; ctx.font = "700 56px 'Space Grotesk', sans-serif"; ctx.fillText("demo food app", 40, 110);
    if (mode === "order") {
      ctx.fillStyle = INK; ctx.font = "700 52px 'Space Grotesk', sans-serif"; ctx.fillText("Order #1042", 40, 260);
      [["Biryani", "₹200"], ["Lassi", "₹60"]].forEach(([a, b], i) => {
        ctx.fillStyle = "#e9dfc9"; roundRect(ctx, 30, 300 + i * 120, w - 60, 100, 24); ctx.fill();
        ctx.fillStyle = INK; ctx.font = "600 42px Inter, sans-serif"; ctx.fillText(a, 60, 365 + i * 120); ctx.fillText(b, w - 180, 365 + i * 120);
      });
      ctx.fillStyle = "#dfe9e2"; roundRect(ctx, 30, 560, w - 60, 280, 30); ctx.fill();
      ctx.strokeStyle = "#b9cdbf"; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(60, 800); ctx.lineTo(200, 660); ctx.lineTo(330, 720); ctx.lineTo(w - 60, 600); ctx.stroke();
      ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(330, 720, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK; ctx.font = "600 38px Inter, sans-serif"; ctx.fillText("Rider: 4 min door", 40, 900);
      ctx.fillStyle = TEAL; roundRect(ctx, 30, h - 170, w - 60, 110, 55); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 46px 'Space Grotesk', sans-serif"; ctx.fillText("Paid ✓", w / 2 - 80, h - 98);
    } else {
      ctx.fillStyle = INK; ctx.font = "700 50px 'Space Grotesk', sans-serif"; ctx.fillText("Comments", 40, 260);
      [["you", "SQL ya NoSQL?"], ["dev_23", "Postgres!"], ["anu.codes", "MongoDB + Redis"]].forEach(([u, m], i) => {
        ctx.fillStyle = i === 0 ? "#fde3d8" : "#ece3cf"; roundRect(ctx, 30, 300 + i * 190, w - 60, 160, 34); ctx.fill();
        ctx.fillStyle = "#7b6a50"; ctx.font = "600 34px Inter, sans-serif"; ctx.fillText(u, 60, 350 + i * 190);
        ctx.fillStyle = INK; ctx.font = "600 44px Inter, sans-serif"; ctx.fillText(m, 60, 410 + i * 190);
      });
      ctx.fillStyle = TEAL; roundRect(ctx, 30, h - 170, w - 60, 110, 55); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 46px 'Space Grotesk', sans-serif"; ctx.fillText("Follow +", w / 2 - 95, h - 98);
    }
  };
  const order = textPlate(1.52, 3.18, draw("order"), 400);
  const comment = textPlate(1.52, 3.18, draw("comment"), 400);
  const material = new THREE.MeshStandardMaterial({ map: order.texture, roughness: .35, emissive: 0xffffff, emissiveMap: order.texture, emissiveIntensity: .25 });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 3.18), material);
  screen.position.set(0, 1.85, .085);
  group.add(body, screen);
  const setMode = (mode: "order" | "comment") => {
    const map = mode === "order" ? order.texture : comment.texture;
    if (material.map !== map) { material.map = map; material.emissiveMap = map; material.needsUpdate = true; }
  };
  return { group: shadowed(group), setMode };
}

function receipt() {
  const tex = textPlate(.9, 1.2, (ctx, w, h) => {
    ctx.fillStyle = "#fffaf0"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = INK; ctx.font = "700 40px 'Space Grotesk', sans-serif"; ctx.fillText("ORDER", 30, 70);
    ctx.fillStyle = "#c9bfa8"; for (let i = 0; i < 4; i++) ctx.fillRect(30, 110 + i * 34, w - 60 - (i % 2) * 50, 12);
    ctx.fillStyle = ORANGE; ctx.font = "700 54px 'Space Grotesk', sans-serif"; ctx.fillText("₹200", 30, h - 40);
  });
  return shadowed(new THREE.Mesh(new RoundedBoxGeometry(.9, 1.2, .03, 2, .012), new THREE.MeshStandardMaterial({ map: tex.texture, roughness: .7 })));
}

function menuToken() {
  const tex = textPlate(1, 1, (ctx, w, h) => {
    ctx.fillStyle = CREAM; roundRect(ctx, 0, 0, w, h, 40); ctx.fill();
    ctx.fillStyle = "#f2c46d"; ctx.beginPath(); ctx.arc(w / 2, h / 2 - 10, 80, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ORANGE; for (const [x, y] of [[-26, -24], [28, -6], [-6, 30]]) { ctx.beginPath(); ctx.arc(w / 2 + x, h / 2 - 10 + y, 13, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = INK; ctx.font = "700 34px 'Space Grotesk', sans-serif"; ctx.fillText("MENU", w / 2 - 46, h - 22);
  });
  return shadowed(new THREE.Mesh(new RoundedBoxGeometry(1, 1, .06, 3, .04), new THREE.MeshStandardMaterial({ map: tex.texture, roughness: .6 })));
}

function pin() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xcd5137, roughness: .35, emissive: 0xcd5137, emissiveIntensity: .1 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(.3, 32, 20), material);
  head.position.y = .82;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.24, .62, 32), material);
  tip.rotation.x = Math.PI; tip.position.y = .42;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(.12, 20, 12), standard(0xfff7e6, .4));
  dot.position.set(0, .84, .22);
  group.add(head, tip, dot);
  return shadowed(group);
}

function kvTile(width: number, color: string, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const tex = textPlate(width, .74, (ctx, w, h) => { ctx.fillStyle = color; roundRect(ctx, 0, 0, w, h, 40); ctx.fill(); draw(ctx, w, h); });
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, .74, .1, 3, .05), standard(new THREE.Color(color).getHex(), .5));
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width - .04, .7), new THREE.MeshStandardMaterial({ map: tex.texture, roughness: .5 }));
  face.position.z = .052;
  mesh.add(face);
  return { mesh: shadowed(mesh), tex };
}

function mapTile() {
  const tex = textPlate(3.8, 3.4, (ctx, w, h) => {
    ctx.fillStyle = "#c9d8c4"; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#a9c0a3"; for (let x = 0; x < 6; x++) for (let y = 0; y < 5; y++) { roundRect(ctx, 30 + x * 160, 30 + y * 170, 120, 130, 18); ctx.fill(); }
    ctx.strokeStyle = "#fffaf0"; ctx.lineWidth = 30; ctx.lineCap = "round";
    for (let x = 0; x < 7; x++) { ctx.beginPath(); ctx.moveTo(10 + x * 160, 0); ctx.lineTo(10 + x * 160, h); ctx.stroke(); }
    for (let y = 0; y < 6; y++) { ctx.beginPath(); ctx.moveTo(0, 10 + y * 170); ctx.lineTo(w, 10 + y * 170); ctx.stroke(); }
    ctx.fillStyle = TEAL; ctx.beginPath(); ctx.arc(w - 120, 140, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "700 30px Inter, sans-serif"; ctx.fillText("you", w - 147, 150);
    ctx.strokeStyle = "#cd5137"; ctx.lineWidth = 12; ctx.setLineDash([26, 18]); ctx.lineJoin = "round"; ctx.beginPath();
    MAP_ROUTE.forEach(([x, z], i) => { const px = (x / 3.8 + .5) * w, py = (z / 3.4 + .5) * h; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    ctx.stroke(); ctx.setLineDash([]);
  });
  const top = new THREE.MeshStandardMaterial({ map: tex.texture, roughness: .8 });
  const side = standard(0xd6ccb4, .8);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(3.8, .16, 3.4), [side, side, top, side, side, side]);
  mesh.position.y = .08;
  return shadowed(mesh);
}

function ramStick() {
  const group = new THREE.Group();
  const pcb = new THREE.Mesh(new RoundedBoxGeometry(3.0, .8, .07, 2, .02), new THREE.MeshStandardMaterial({ color: 0x1f6b4f, roughness: .5, emissive: 0x2fbf9a, emissiveIntensity: 0 }));
  group.add(pcb);
  for (let i = 0; i < 8; i++) {
    const chip = new THREE.Mesh(new RoundedBoxGeometry(.28, .42, .06, 2, .015), standard(0x161b1d, .35, .2));
    chip.position.set(-1.23 + i * .35, .08, .06);
    group.add(chip);
  }
  for (let i = 0; i < 24; i++) {
    const pinMesh = new THREE.Mesh(new THREE.BoxGeometry(.07, .12, .075), standard(0xd4a943, .3, .9));
    pinMesh.position.set(-1.35 + i * .117, -.34, 0);
    group.add(pinMesh);
  }
  return { group: shadowed(group), pcb };
}

function monolith(word: string, icon: (ctx: CanvasRenderingContext2D, cx: number, cy: number) => void) {
  const tex = textPlate(1.9, 2.5, (ctx, w, h) => {
    ctx.fillStyle = "#183236"; roundRect(ctx, 0, 0, w, h, 40); ctx.fill();
    ctx.strokeStyle = "#9ff3d9"; ctx.lineWidth = 8; roundRect(ctx, 14, 14, w - 28, h - 28, 32); ctx.stroke();
    icon(ctx, w / 2, h * .38);
    fitText(ctx, word, (s) => `700 ${s}px 'Space Grotesk', sans-serif`, 92, w - 60);
    ctx.fillStyle = "#f3f0e4"; ctx.textAlign = "center"; ctx.fillText(word, w / 2, h * .8);
  });
  const material = new THREE.MeshStandardMaterial({ map: tex.texture, roughness: .5, emissive: 0xffffff, emissiveMap: tex.texture, emissiveIntensity: .35 });
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(1.9, 2.5, .26, 4, .08), material);
  mesh.position.y = 1.25;
  const group = new THREE.Group();
  group.add(mesh);
  return shadowed(group);
}

function outline(width: number, height: number, color: number) {
  const line = new THREE.LineSegments(new THREE.EdgesGeometry(new RoundedBoxGeometry(width, height, .02, 3, .08), 30),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0 }));
  return line;
}

function glowDisc(radius: number, color: number) {
  const tex = canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "#ffffffcc"); g.addColorStop(.6, "#ffffff44"); g.addColorStop(1, "#ffffff00");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: tex.texture, color, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = .02;
  return mesh;
}

export function createSqlScene(output: HTMLCanvasElement, c: SqlCues): MotionScene {
  const studio = createStudio(output);
  const { scene } = studio;

  // SQL zone: related ORDERS and PAYMENTS tables.
  const orders = board("orders", ["id", "user", "item", "status"],
    [["1039", "asha", "pizza", "delivered"], ["1040", "ravi", "thali", "delivered"], ["1041", "meera", "dosa", "on way"]],
    ["1042", "you", "biryani", "placed"], 3.9);
  orders.group.position.set(SQL_X - 1.75, 0, 0);
  orders.group.rotation.y = .12;
  const payments = board("payments", ["pay_id", "order_id", "amount"],
    [["p-77", "1039", "₹249"], ["p-78", "1040", "₹180"], ["p-79", "1041", "₹120"]],
    ["p-80", "1042", "₹200"], 3.0);
  payments.group.position.set(SQL_X + 1.95, 0, .25);
  payments.group.rotation.y = -.12;
  scene.add(orders.group, payments.group);
  scene.updateMatrixWorld(true);
  const rowWorld = (b: typeof orders, i: number, edge: number, width: number) =>
    new THREE.Vector3(edge * (width - .24) / 2, b.rowY(i), .16).applyMatrix4(b.group.matrixWorld);
  const links = [0, 1, 2, 3].map((i) => {
    const a = rowWorld(orders, i, 1, 3.9), b = rowWorld(payments, i, -1, 3.0);
    const curve = new THREE.CubicBezierCurve3(a, a.clone().add(new THREE.Vector3(.35, 0, .45)), b.clone().add(new THREE.Vector3(-.35, 0, .45)), b);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .025, 8),
      new THREE.MeshBasicMaterial({ color: i === 3 ? 0xffc46b : 0x5fd4b0, transparent: true, opacity: 0 }));
    mesh.geometry.setDrawRange(0, 0);
    scene.add(mesh);
    return mesh;
  });
  const txWidth = 7.9;
  const bracket = outline(txWidth, .78, 0xffc46b);
  bracket.position.set(SQL_X, orders.newY, .55);
  scene.add(bracket);

  // Document zone: menu items with different shapes.
  const tray = new THREE.Mesh(new RoundedBoxGeometry(5.6, .2, 2.0, 3, .08), new THREE.MeshStandardMaterial({ color: 0x2a3c42, roughness: .5, emissive: 0xff8a4d, emissiveIntensity: 0 }));
  tray.position.set(DOC_X, .1, -.2);
  scene.add(shadowed(tray));
  const docs = [
    menuDoc("pizza", [["name", "\"Pizza\""], ["sizes", "[S, M, L]"], ["veg", "true"], ["price", "{S:199, L:349}"]], 2.75),
    menuDoc("biryani", [["name", "\"Biryani\""], ["spice", "3/5"], ["serves", "2"]], 2.3),
    menuDoc("lassi", [["name", "\"Lassi\""], ["price", "60"]], 1.85),
  ];
  const docHome: XYZ[] = [[DOC_X - 1.75, .2, -.1], [DOC_X, .2, -.35], [DOC_X + 1.75, .2, -.1]];
  docs.forEach((doc, i) => { doc.position.set(...docHome[i]); doc.rotation.y = [.18, 0, -.18][i]; scene.add(doc); });

  // Key-value zone: rider map, key -> value panel, RAM.
  const map = mapTile();
  map.position.set(KV_X, 0, .5);
  scene.add(map);
  const keyTile = kvTile(1.7, TEAL, (ctx, w, h) => {
    ctx.fillStyle = "#cdeee3"; ctx.font = "600 34px Inter, sans-serif"; ctx.fillText("KEY", 28, 46);
    ctx.fillStyle = "#fff"; ctx.font = "700 56px 'Space Grotesk', monospace"; ctx.fillText("rider:42", 28, h - 30);
  });
  const valueTile = kvTile(2.1, CREAM, () => undefined);
  const drawValue = (x: number, y: number) => {
    const { ctx, canvas, texture } = valueTile.tex;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = CREAM; roundRect(ctx, 0, 0, canvas.width, canvas.height, 40); ctx.fill();
    ctx.fillStyle = "#9a8767"; ctx.font = "600 34px Inter, sans-serif"; ctx.fillText("VALUE", 28, 46);
    ctx.fillStyle = ORANGE; ctx.font = "700 54px 'Space Grotesk', monospace"; ctx.fillText(`x:${x}  y:${y}`, 28, canvas.height - 30);
    texture.needsUpdate = true;
  };
  const arrowTex = textPlate(.5, .5, (ctx, w, h) => { ctx.fillStyle = INK; ctx.font = "700 110px 'Space Grotesk', sans-serif"; ctx.fillText("→", 4, h - 30); });
  const arrow = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshBasicMaterial({ map: arrowTex.texture, transparent: true }));
  const kvPanel = new THREE.Group();
  keyTile.mesh.position.x = -1.25; valueTile.mesh.position.x = 1.15; arrow.position.set(-.18, 0, .06);
  const kvPost = new THREE.Mesh(new RoundedBoxGeometry(.18, 2.0, .18, 3, .05), standard(0x182429, .5, .2));
  kvPost.position.y = -1.3;
  kvPanel.add(keyTile.mesh, valueTile.mesh, arrow, shadowed(kvPost));
  kvPanel.position.set(KV_X, 2.3, -1.6);
  scene.add(kvPanel);
  const ram = ramStick();
  scene.add(ram.group);
  const rider = pin();
  scene.add(rider);
  const route = MAP_ROUTE;
  const routeAt = (n: number): [number, number] => {
    const lengths = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
    let d = clamp(n) * lengths.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lengths.length; i++) {
      if (d <= lengths[i]) { const k = d / lengths[i]; return [lerp(route[i][0], route[i + 1][0], k), lerp(route[i][1], route[i + 1][1], k)]; }
      d -= lengths[i];
    }
    return route[route.length - 1];
  };

  // Phone, flying tokens and decision monoliths.
  const device = phone();
  device.group.position.set(...PHONE);
  scene.add(device.group);
  const ticket = receipt(), menuCard = menuToken();
  scene.add(ticket, menuCard);
  const stones = [
    monolith("SHAPE?", (ctx, x, y) => { ctx.fillStyle = "#ffb27e"; ctx.fillRect(x - 150, y - 40, 90, 90); ctx.beginPath(); ctx.arc(x + 10, y + 5, 48, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 80, y + 50); ctx.lineTo(x + 130, y - 45); ctx.lineTo(x + 180, y + 50); ctx.fill(); }),
    monolith("QUERY?", (ctx, x, y) => { ctx.strokeStyle = "#ffb27e"; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(x - 20, y - 15, 70, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 32, y + 37); ctx.lineTo(x + 100, y + 105); ctx.stroke(); }),
    monolith("CONSISTENCY?", (ctx, x, y) => { ctx.strokeStyle = "#ffb27e"; ctx.lineWidth = 22; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - 90, y); ctx.lineTo(x - 25, y + 65); ctx.lineTo(x + 100, y - 70); ctx.stroke(); }),
  ];
  stones.forEach((stone, i) => { stone.position.set(-2.2 + i * 2.2, 0, 2.6); stone.rotation.y = [.22, 0, -.22][i]; scene.add(stone); });
  const sqlGlow = glowDisc(4.6, 0x2fbf9a), docGlow = glowDisc(3.6, 0xff8a4d), kvGlow = glowDisc(3.4, 0xff8a4d);
  sqlGlow.position.x = SQL_X; docGlow.position.x = DOC_X; kvGlow.position.set(KV_X, .02, .2);
  scene.add(sqlGlow, docGlow, kvGlow);
  const sqlFrame = outline(8.4, 4.6, 0x5fe0b8);
  sqlFrame.position.set(SQL_X, 2.55, .7);
  const nosqlFrame = outline(12.6, 4.2, 0xffa66b);
  nosqlFrame.position.set((DOC_X + KV_X) / 2, 2.2, .9);
  scene.add(sqlFrame, nosqlFrame);
  const accent = new THREE.PointLight(0x7fffd4, 0, 12, 1.4);
  scene.add(accent);

  // Hook: data blocks spill from ORDERS towards the documents (a painful migration).
  const blocks = Array.from({ length: 8 }, (_, i) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(.42, .26, .26, 2, .05),
      new THREE.MeshStandardMaterial({ color: 0x2fbf9a, roughness: .4, emissive: 0xcd5137, emissiveIntensity: 0 }));
    scene.add(shadowed(mesh));
    return { mesh, delay: i * .19, from: rowWorld(orders, i % 3, -.4 + (i % 3) * .4, 3.9), lane: (i % 4) - 1.5 };
  });

  // Camera script.
  const { camera, shot } = createCamera();
  const sqlWide = shot([SQL_X, 2.2, .3], [0, .2, 1], 9.0);
  const moves: Move[] = [
    [0, 0, shot([-3.4, 2.0, 0], [-.55, .3, 1], 7.6)],
    [0, c.migrate, shot([-3.1, 2.0, 0], [-.45, .28, 1], 7.0), linear],
    [c.migrate, c.migrate + .45, shot([-2.6, 2.0, -.2], [.12, .42, 1], 10.5), expoInOut],
    [c.migrate + .45, c.app, shot([-2.6, 1.9, -.2], [.18, .4, 1], 9.8), linear],
    [c.app, c.app + .45, shot([0, 2.55, 4.6], [0, .16, 1], 4.4), expoInOut],
    [c.app + .45, c.sql, shot([0, 2.75, 4.6], [.06, .14, 1], 4.0), linear],
    [c.sql, c.sql + .5, sqlWide, expoInOut],
    [c.sql + .5, c.schema, shot([SQL_X, 2.25, .3], [.03, .2, 1], 8.5), linear],
    [c.schema, c.schema + .6, shot([SQL_X, 2.6, .3], [-.12, .16, 1], 8.2), inOut],
    [c.schema + .6, c.money, shot([SQL_X, 2.55, .3], [-.08, .16, 1], 8.0), linear],
    [c.money, c.money + .6, shot([SQL_X, 1.75, .4], [0, .1, 1], 8.6), inOut],
    [c.money + .6, c.acid, shot([SQL_X, 1.8, .4], [.05, .12, 1], 8.3), linear],
    [c.acid, c.acid + .35, shot([SQL_X, 1.8, .4], [0, .12, 1], 7.6), expoInOut],
    [c.acid + .35, c.menuBeat, shot([SQL_X, 1.8, .4], [0, .12, 1], 7.3), linear],
    [c.menuBeat, c.menuBeat + .5, shot([DOC_X, 1.65, 0], [0, .2, 1], 6.4), expoInOut],
    [c.menuBeat + .5, c.shape, shot([DOC_X, 1.65, 0], [.05, .2, 1], 6.0), linear],
    [c.shape, c.shape + .9, shot([DOC_X, 1.55, 0], [.5, .26, 1], 5.9), inOut],
    [c.shape + .9, c.mongo, shot([DOC_X, 1.55, 0], [.42, .26, 1], 5.7), linear],
    [c.mongo, c.mongo + .8, shot([DOC_X, 1.2, 0], [.12, .5, 1], 7.0), inOut],
    [c.mongo + .8, c.riderBeat, shot([DOC_X, 1.2, 0], [.05, .5, 1], 6.6), linear],
    [c.riderBeat, c.riderBeat + .5, shot([KV_X, 1.0, .4], [0, 1.0, 1], 5.6), expoInOut],
    [c.riderBeat + .5, c.kv, shot([KV_X, 1.0, .4], [.08, 1.0, 1], 5.3), linear],
    [c.kv, c.kv + .7, shot([KV_X, 2.1, -1.2], [-.1, .2, 1], 5.4), inOut],
    [c.kv + .7, c.redis, shot([KV_X, 2.1, -1.2], [-.04, .2, 1], 5.1), linear],
    [c.redis, c.redis + .8, shot([KV_X, 1.4, .8], [.22, .32, 1], 6.6), inOut],
    [c.redis + .8, c.nuance, shot([KV_X, 1.4, .8], [.14, .32, 1], 6.2), linear],
    [c.nuance, c.nuance + .5, shot([-2.6, 1.9, 0], [0, .3, 1], 10.4), expoInOut],
    [c.nuance + .5, c.questions - .1, shot([-2.6, 1.9, 0], [.05, .28, 1], 9.6), linear],
    [c.questions - .1, c.questions + .5, shot([0, 1.55, 2.6], [0, .2, 1], 7.4), expoInOut],
    [c.questions + .5, c.pickSql, shot([0, 1.55, 2.6], [0, .2, 1], 6.9), linear],
    [c.pickSql, c.pickSql + .45, sqlWide, expoInOut],
    [c.pickSql + .45, c.pickNoSql, shot([SQL_X, 2.2, .3], [.04, .2, 1], 8.5), linear],
    [c.pickNoSql, c.pickNoSql + .45, shot([(DOC_X + KV_X) / 2, 1.6, 0], [0, .42, 1], 13.6), expoInOut],
    [c.pickNoSql + .45, c.safe, shot([(DOC_X + KV_X) / 2, 1.6, 0], [0, .42, 1], 13.0), linear],
    [c.safe, c.safe + .45, shot([SQL_X, 2.2, .3], [-.06, .2, 1], 8.6), expoInOut],
    [c.safe + .45, c.cta, shot([SQL_X, 2.2, .3], [0, .2, 1], 8.0), linear],
    [c.cta, c.cta + .5, shot([0, 2.5, 4.6], [-.1, .14, 1], 4.4), expoInOut],
    [c.cta + .5, c.end, shot([0, 2.5, 4.6], [.04, .14, 1], 3.9), linear],
  ];
  const pose = poseTrack(moves);

  const phoneTop: XYZ = [PHONE[0], 4.15, PHONE[2] + .1];
  const hover = (i: number, t: number): XYZ => [PHONE[0] - 1.25 + i * 1.25, phoneTop[1] + Math.sin(t * 2.2 + i) * .05, phoneTop[2]];
  const arc = (a: XYZ, b: XYZ, n: number, height = 1.6): XYZ => { const p = mix(a, b, n); p[1] += Math.sin(Math.PI * n) * height; return p; };
  const sqlLanding: XYZ = [SQL_X + 1.95, 4.5, 1.1];
  const docLanding: XYZ = [DOC_X, 3.5, 1.0];
  const mapStart = (): XYZ => { const [x, z] = route[0]; return [KV_X + x, .16, .5 + z]; };

  function tokenState(i: number, t: number, launch: number, fly: number, landing: XYZ, vanish: number): { p: XYZ; s: number } | null {
    const appear = [c.orders, c.menu, c.rider][i];
    if (t < appear || t > vanish + .3) return null;
    const born = out(span(t, appear, .4));
    const home = hover(i, t);
    const start: XYZ = [PHONE[0], 2.2, PHONE[2] + .1];
    if (t < launch) return { p: mix(start, home, born), s: born * (1 - inOut(span(t, vanish, .3))) };
    const n = inOut(span(t, launch, fly));
    const p = arc(home, landing, n, 2.4);
    p[1] += n >= 1 ? Math.sin(t * 2) * .05 : 0;
    return { p, s: 1 - inOut(span(t, vanish, .3)) };
  }

  function riderPos(t: number): { p: XYZ; s: number } {
    if (t < c.app + .3) { const [x, z] = routeAt(.15 + t / c.app * .2); return { p: [KV_X + x, .16, .5 + z], s: .65 }; }
    if (t < c.riderBeat) {
      const token = tokenState(2, t, 9999, 1, mapStart(), c.sql + .1);
      return token ?? { p: [0, -5, 0], s: 0 };
    }
    if (t < c.riderBeat + .8) {
      const n = out(span(t, c.riderBeat + .1, .6));
      const p = mapStart(); p[1] += (1 - n) * 3.5;
      return { p, s: .65 * clamp(n * 3) };
    }
    const [x, z] = routeAt((t - c.riderBeat - .8) / 22);
    const hop = Math.abs(Math.sin((t - c.riderBeat) * 9)) * .05;
    return { p: [KV_X + x, .16 + hop, .5 + z], s: .65 };
  }

  const docVisible = (i: number, t: number) => {
    if (t < c.app + .4) return 1;
    const at = [c.pizza, c.biryani, c.shape + .15][i];
    return t < c.menuBeat - .5 ? 0 : out(span(t, at, .45));
  };

  function apply(t: number) {
    const dark = inOut(span(t, c.questions - .3, .8)) * (1 - inOut(span(t, c.cta - .2, .7)));
    studio.mood(dark);

    // Hook spill blocks.
    for (const b of blocks) {
      const n = span(t, c.migrate + .1 + b.delay, 1.1);
      const visible = n > 0 && t < c.app + .1;
      b.mesh.visible = visible;
      if (!visible) continue;
      const target: XYZ = [DOC_X - 1.2 + b.lane * .5, 1.4 + (b.lane % 2) * .4, 1.0];
      b.mesh.position.set(...arc(b.from.toArray() as XYZ, target, inOut(n), 1.4 + b.lane * .2));
      b.mesh.rotation.set(n * 5 + b.lane, n * 7, n * 3);
      const material = b.mesh.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = n * .9;
      material.color.setHex(n > .5 ? 0xe07a5f : 0x2fbf9a);
      b.mesh.scale.setScalar(n >= 1 ? 1 - span(t, c.migrate + .1 + b.delay + 1.1, .3) : 1);
    }

    // SQL: schema header, relationships, transaction.
    const schemaGlow = Math.sin(Math.PI * span(t, c.schema, 1.4));
    orders.headMat.emissiveIntensity = schemaGlow * .5; payments.headMat.emissiveIntensity = schemaGlow * .5;
    links.forEach((link, i) => {
      const material = link.material as THREE.MeshBasicMaterial;
      if (i < 3) {
        const drawn = span(t, c.schema + .5 + i * .18, .5);
        link.geometry.setDrawRange(0, Math.floor(drawn * link.geometry.index!.count));
        material.opacity = t > c.app ? .85 * drawn : 0;
      } else {
        const on = t > c.both && (t < c.rollback || t > c.acid + .2);
        const drawn = t < c.rollback ? span(t, c.both, .4) : span(t, c.acid + .2, .4);
        link.geometry.setDrawRange(0, Math.floor(drawn * link.geometry.index!.count));
        material.opacity = on ? .95 : 0;
      }
    });
    const payIn = out(span(t, c.money + .15, .45)), orderIn = out(span(t, c.money + .85, .45));
    const rollback = inOut(span(t, c.rollback + .15, .45));
    const recommit = out(span(t, c.acid, .5));
    const rowShow = (enterN: number) => t < c.rollback ? enterN : t < c.acid ? 1 - rollback : recommit;
    const rows: [typeof orders, number][] = [[payments, rowShow(payIn)], [orders, rowShow(orderIn)]];
    for (const [b, n] of rows) {
      const material = b.newRow.material as THREE.MeshStandardMaterial;
      b.newRow.visible = t > c.app && n > .01;
      b.newRow.position.set(0, b.newY, .11 + (1 - n) * (t < c.rollback ? 1.4 : .2));
      b.newRow.scale.set(1, Math.max(.01, t > c.rollback && t < c.acid ? n : 1), 1);
      material.opacity = n;
      const red = t > c.rollback && t < c.acid ? 1 : 0;
      const green = t > c.both && t < c.rollback ? Math.sin(Math.PI * span(t, c.both, .9)) : t > c.acid ? Math.sin(Math.PI * span(t, c.acid + .1, 1)) : 0;
      material.emissive.setRGB(red * .55 + green * .05, green * .4, green * .25);
    }
    const bracketMat = bracket.material as THREE.LineBasicMaterial;
    const bracketOn = t > c.both - .05 && t < c.questions;
    bracketMat.opacity = bracketOn ? (t < c.rollback ? out(span(t, c.both - .05, .3)) : t < c.acid ? .9 * (1 - span(t, c.rollback + .5, .3)) + .25 : 1) : 0;
    bracketMat.color.setHex(t > c.rollback && t < c.acid ? 0xff6b5a : t > c.acid ? 0x6ff0c4 : 0xffc46b);
    bracket.scale.set(1 + (t > c.acid ? .03 * Math.sin(Math.PI * span(t, c.acid, .4)) : 0), 1, 1);
    const shake = t > c.rollback && t < c.rollback + .3 ? Math.sin(t * 90) * .05 * (1 - span(t, c.rollback, .3)) : 0;
    bracket.position.x = SQL_X + shake;

    // Documents.
    docs.forEach((doc, i) => {
      const n = docVisible(i, t);
      const s = rise(clamp(n));
      doc.visible = n > .01;
      doc.scale.set(1, Math.max(.01, s), 1);
      const slide = t > c.mongo ? out(span(t, c.mongo + .15 + i * .1, .5)) : 0;
      doc.position.set(docHome[i][0], docHome[i][1] + Math.sin(t * 1.6 + i) * .03 * (1 - slide), docHome[i][2] - slide * .1);
      doc.rotation.y = [.18, 0, -.18][i] * (1 - slide * .6) + (t > c.shape && t < c.mongo ? Math.sin((t - c.shape) * 2.4 + i) * .08 : 0);
    });
    const trayGlow = t > c.mongo ? Math.min(1, span(t, c.mongo, .5)) * (.55 + Math.sin(t * 4) * .1) : 0;
    (tray.material as THREE.MeshStandardMaterial).emissiveIntensity = trayGlow * (t > c.questions ? .3 : 1);

    // Tokens from the phone.
    const sqlToken = tokenState(0, t, c.sql + .05, .75, sqlLanding, c.money + .15);
    ticket.visible = !!sqlToken;
    if (sqlToken) { ticket.position.set(...sqlToken.p); ticket.scale.setScalar(Math.max(.01, sqlToken.s)); ticket.rotation.set(-.1, Math.sin(t * 1.3) * .2, Math.sin(t * 1.7) * .06); }
    const docToken = t < c.menuBeat ? tokenState(1, t, 9999, 1, docLanding, c.sql + .1)
      : t < c.pizza + .3 ? { p: [docLanding[0], docLanding[1] + (1 - out(span(t, c.menuBeat, .5))) * 3, docLanding[2]] as XYZ, s: 1 - inOut(span(t, c.pizza, .3)) } : null;
    menuCard.visible = !!docToken;
    if (docToken) { menuCard.position.set(...docToken.p); menuCard.scale.setScalar(Math.max(.01, docToken.s)); menuCard.rotation.set(-.05, Math.sin(t * 1.5) * .25, 0); }
    const r = riderPos(t);
    rider.position.set(...r.p); rider.scale.setScalar(Math.max(.01, r.s));
    rider.rotation.y = t * .8;
    const [gx, gy] = routeAt((t - c.riderBeat - .8) / 22);
    const step = Math.floor(t * 2.5);
    drawValueIfChanged(Math.round((gx + 2) * 10 + step % 2 * 0), Math.round((gy + 2) * 10));

    // RAM rises for "in-memory".
    const ramN = out(span(t, c.ram, .6));
    ram.group.visible = ramN > .01 && t < c.questions + .5;
    ram.group.position.set(KV_X, -.5 + ramN * 1.0 + Math.sin(t * 2) * .03, 2.55);
    ram.group.rotation.set(-.15, 0, 0);
    (ram.pcb.material as THREE.MeshStandardMaterial).emissiveIntensity = ramN * (.35 + Math.sin(t * 5) * .1);

    // Nuance: features cross over.
    const nuance = t > c.nuance && t < c.questions;
    orders.group.position.y = 0; payments.group.position.x = SQL_X + 1.95 + (nuance ? out(span(t, c.overlap + .3, .7)) * .5 : 0);

    // Decision.
    stones.forEach((stone, i) => {
      const at = [c.qShape, c.qQuery, c.qConsistency][i];
      const up = out(span(t, at - .25, .5)) * (1 - inOut(span(t, c.pickSql - .1, .4)));
      stone.visible = up > .01;
      stone.position.y = (up - 1) * 2.7;
    });
    const pickSql = t > c.pickSql && t < c.pickNoSql || t > c.safe && t < c.cta;
    const pickNo = t > c.pickNoSql && t < c.safe;
    const glowN = (on: boolean, at: number) => on ? out(span(t, at + .2, .4)) : 0;
    (sqlGlow.material as THREE.MeshBasicMaterial).opacity = glowN(pickSql, t > c.safe ? c.safe : c.pickSql) * .8;
    (docGlow.material as THREE.MeshBasicMaterial).opacity = glowN(pickNo, c.pickNoSql) * .7;
    (kvGlow.material as THREE.MeshBasicMaterial).opacity = glowN(pickNo, c.pickNoSql) * .7;
    (sqlFrame.material as THREE.LineBasicMaterial).opacity = glowN(pickSql, t > c.safe ? c.safe : c.pickSql);
    (nosqlFrame.material as THREE.LineBasicMaterial).opacity = glowN(pickNo, c.pickNoSql);
    accent.intensity = pickSql ? 14 * glowN(pickSql, t > c.safe ? c.safe : c.pickSql) : pickNo ? 10 * glowN(pickNo, c.pickNoSql) : 0;
    accent.color.setHex(pickSql ? 0x7fffd4 : 0xffa66b);
    accent.position.set(pickSql ? SQL_X : (DOC_X + KV_X) / 2, 4, 3);

    device.setMode(t > c.cta ? "comment" : "order");
    device.group.visible = t > c.app - .1 && t < c.sql + 1 || t > c.cta - .1;
    device.group.rotation.y = t > c.cta ? Math.sin((t - c.cta) * .8) * .08 : Math.sin(t * .9) * .06;

    const view = pose(t);
    const kick = (at: number) => t > at && t < at + .25 ? Math.exp(-(t - at) * 18) * .05 : 0;
    const shake2 = kick(c.acid) + kick(c.qShape) + kick(c.qQuery) + kick(c.qConsistency);
    camera.position.set(view.p[0] + Math.sin(t * 91) * shake2, view.p[1] + Math.cos(t * 77) * shake2, view.p[2]);
    camera.lookAt(...view.l);
    camera.fov = view.fov; camera.updateProjectionMatrix();
  }

  let lastValue = "";
  function drawValueIfChanged(x: number, y: number) {
    const signature = `${x},${y}`;
    if (signature === lastValue) return;
    lastValue = signature; drawValue(x, y);
  }

  function speed(t: number): number {
    return poseSpeed(pose(t), pose(t + 1 / 30));
  }

  return {
    draw: (t) => blurredDraw(studio, camera, t, speed(t), apply),
    dispose: studio.dispose,
  };
}
