import * as THREE from "three";
import { BITS, canvasTexture, clamp01, createToonKit, easeOutBack, easeOutCubic } from "./toon-kit";

export interface ProcessScene {
  /** Scroll progress through the story, 0 → 1. Fully scrubbable in both directions. */
  setProgress(progress: number): void;
  dispose(): void;
}

// ---- Layout (scene units, ground at y = 0) ----
const TUB_H = 1.7;
const TUB_R_TOP = 1.7;
const TUB_R_BOTTOM = 1.35;
const SURFACE_EMPTY = 0.9;
const SURFACE_FULL = 1.42;
const CONE_X = 2.35;
const CONE_SCALE = 0.8;
const CONE_LIFT = 0.3;
const BALL_REST_Y = CONE_LIFT + 2.9 * CONE_SCALE;
const BALL_SCALE = CONE_SCALE; // same size as a scoop sitting in the scaled cone
const TOOL_SCALE = 1.4;
const TUB_SHIFT = -1.25;
const TARGET_Y = 2.1;

// ---- Timeline: where each beat sits in the 0 → 1 scroll ----
const T = {
  dive: { start: 0.09, gap: 0.02, dur: 0.06 },
  whiskIn: [0.25, 0.31],
  whiskOut: [0.5, 0.56],
  blend: [0.28, 0.46],
  frost: [0.52, 0.72],
  shift: [0.74, 0.84],
  coneIn: [0.76, 0.86],
  ballAppear: [0.8, 0.83],
  release: [0.915, 0.945],
} as const;

const seg = (p: number, [a, b]: readonly [number, number] | readonly number[]) => clamp01((p - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = THREE.MathUtils.lerp;

interface Key {
  p: number;
  x: number;
  y: number;
  r: number;
}

/** Smooth interpolation through keyframes (position + tilt). */
function sample(keys: readonly Key[], p: number) {
  if (p <= keys[0].p) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i].p) {
      const a = keys[i - 1];
      const b = keys[i];
      const t = smooth((p - a.p) / (b.p - a.p));
      return { p, x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), r: lerp(a.r, b.r, t) };
    }
  }
  return keys[keys.length - 1];
}

export function createProcessScene(container: HTMLElement): ProcessScene {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Renderer / camera / lights ----
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 1.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3.5, 6, 5);
  scene.add(key);

  const kit = createToonKit();
  const { toon, inked, gradientMap, buildBall, buildCone } = kit;
  const steel = toon("#D9E0F0");
  const color = new THREE.Color();
  const CREAM = new THREE.Color("#FFF4DD");
  const PINK = new THREE.Color("#FFC7EA");
  const WHITE = new THREE.Color("#FFFFFF");
  const ICE = new THREE.Color("#CFE8FF");

  // ---- Tub ----
  const tub = new THREE.Group();
  scene.add(tub);

  const tubMat = new THREE.MeshToonMaterial({ color: "#FFFFFF", gradientMap, side: THREE.DoubleSide });
  const bodyGeo = new THREE.CylinderGeometry(TUB_R_TOP, TUB_R_BOTTOM, TUB_H, 56, 1, true);
  bodyGeo.translate(0, TUB_H / 2, 0);
  const floorGeo = new THREE.CircleGeometry(TUB_R_BOTTOM, 40);
  floorGeo.rotateX(-Math.PI / 2);
  const floor = new THREE.Mesh(floorGeo, tubMat);
  floor.position.y = 0.02;
  tub.add(inked(new THREE.Mesh(bodyGeo, tubMat), 0.05), floor);

  // Label band with polka dots
  const polka = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = "#FFC7EA";
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "#FFFFFF";
    for (const [x, y] of [[32, 32], [96, 96], [96, -32], [-32, 96], [32, 160], [160, 32]]) {
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  polka.repeat.set(5, 1);
  const radiusAt = (y: number) => TUB_R_BOTTOM + ((TUB_R_TOP - TUB_R_BOTTOM) * y) / TUB_H;
  const bandGeo = new THREE.CylinderGeometry(radiusAt(1.1) + 0.03, radiusAt(0.4) + 0.03, 0.7, 56, 1, true);
  bandGeo.translate(0, 0.75, 0);
  tub.add(inked(new THREE.Mesh(bandGeo, toon("#ffffff", polka)), 0.035));

  const rimGeo = new THREE.TorusGeometry(TUB_R_TOP, 0.09, 12, 56);
  rimGeo.rotateX(Math.PI / 2);
  const rim = inked(new THREE.Mesh(rimGeo, toon("#489CFF")), 0.04);
  rim.position.y = TUB_H;
  tub.add(rim);

  // Gelato surface with a swirl texture we can rotate
  const swirl = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "#D2CBE0";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.05) {
      const r = (a / (Math.PI * 6)) * (s / 2 - 12);
      const x = s / 2 + Math.cos(a) * r;
      const y = s / 2 + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
  swirl.wrapS = swirl.wrapT = THREE.ClampToEdgeWrapping;
  swirl.center.set(0.5, 0.5);

  const sideMat = new THREE.MeshToonMaterial({ color: "#FFF4DD", gradientMap });
  const topMat = new THREE.MeshToonMaterial({ color: "#FFF4DD", gradientMap, map: swirl });
  const surface = new THREE.Mesh(new THREE.CylinderGeometry(TUB_R_TOP - 0.1, TUB_R_TOP - 0.1, 0.16, 56), [sideMat, topMat, sideMat]);
  tub.add(surface);

  // ---- Ingredients ----
  const ink = (m: THREE.Mesh, t = 0.04) => inked(m, t);
  // Same kawaii face as the scoops, fitted to an ingredient's size and squash
  const face = (r: number, sx = 1, sy = 1, sz = 1, y = 0) => {
    const f = kit.buildFace();
    f.scale.set((r * sx) / 0.95, (r * sy) / 0.95, (r * sz) / 0.95);
    f.position.y = y;
    return f;
  };
  const dot = new THREE.SphereGeometry(0.025, 6, 6);
  const leafGeo = new THREE.ConeGeometry(0.1, 0.28, 6);

  function strawberry() {
    const g = new THREE.Group();
    const body = ink(new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), toon("#F0384F")));
    body.scale.set(1, 1.15, 1);
    g.add(body, face(0.42, 1, 1.25, 1, -0.04));
    const seedMat = toon("#FFE08A");
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4;
      const h = -0.3 + (i / 11) * 0.7;
      if (h > -0.2 && h < 0.2 && Math.sin(a) > 0.2) continue; // keep the face clear
      const rr = Math.sqrt(Math.max(0.42 ** 2 - (h / 1.15) ** 2, 0)) + 0.01;
      const seed = new THREE.Mesh(dot, seedMat);
      seed.position.set(Math.cos(a) * rr, h, Math.sin(a) * rr);
      g.add(seed);
    }
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(leafGeo, toon("#3FAE5B"));
      const a = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 0.16, 0.5, Math.sin(a) * 0.16);
      leaf.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
      g.add(leaf);
    }
    return g;
  }

  function milkDrop() {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push(new THREE.Vector2(Math.sin(Math.PI * t ** 0.6) * 0.36, t * 1.25 - 0.45));
    }
    const g = new THREE.Group();
    g.add(ink(new THREE.Mesh(new THREE.LatheGeometry(pts, 28), toon("#E6F3FF")), 0.04), face(0.36, 1, 1.087, 1, -0.06));
    return g;
  }

  function pistachio() {
    const g = new THREE.Group();
    const nut = ink(new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 18), toon("#A8D86B")));
    nut.scale.set(0.78, 1.02, 0.78);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), toon("#E6F6C8"));
    shine.position.set(-0.14, 0.18, 0.22);
    g.add(nut, shine, face(0.38, 0.78, 1.11, 0.78));
    return g;
  }

  function mango() {
    const g = new THREE.Group();
    const fruit = ink(new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), toon("#FFB020")));
    fruit.scale.set(1.1, 0.95, 0.9);
    const leaf = new THREE.Mesh(leafGeo, toon("#3FAE5B"));
    leaf.position.set(0.12, 0.42, 0);
    leaf.rotation.z = -0.9;
    g.add(fruit, leaf, face(0.42, 1.1, 1.03, 0.9));
    return g;
  }

  function sugar() {
    const g = new THREE.Group();
    g.add(ink(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), toon("#FFFFFF")), 0.04));
    return g;
  }

  function blueberry() {
    const g = new THREE.Group();
    const berry = ink(new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), toon("#5B6CF0")), 0.035);
    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 12), toon("#2B2F7A"));
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 0.29;
    g.add(berry, crown, face(0.3, 1, 1.087, 1, -0.02));
    return g;
  }

  const ingredients = [strawberry(), milkDrop(), pistachio(), mango(), sugar(), blueberry()].map((group, i) => {
    scene.add(group);
    return { group, i, spin: new THREE.Vector3(0.4 + i * 0.1, 0.8, 0.3) };
  });

  // ---- Whisk ----
  const whisk = new THREE.Group();
  {
    const rod = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 10), steel), 0.02);
    rod.position.y = 1.7;
    const grip = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.9, 12), toon("#FFC655")), 0.03);
    grip.position.y = 2.65;
    whisk.add(rod, grip);
    for (let i = 0; i < 4; i++) {
      const wire = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.03, 6, 32), steel);
      wire.scale.set(0.6, 1.2, 1);
      wire.position.y = 0.6;
      wire.rotation.y = (i * Math.PI) / 4;
      whisk.add(wire);
    }
  }
  whisk.visible = false;
  scene.add(whisk);

  // ---- Frost crystals ----
  const crystals = Array.from({ length: 14 }, (_, i) => {
    const mesh = ink(new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), toon(i % 3 === 0 ? "#FFFFFF" : "#CFE8FF")), 0.03);
    mesh.scale.set(0.6, 1.5, 0.6);
    const a = (i / 14) * Math.PI * 2 + (i % 2) * 0.3;
    const r = 2.1 + (i % 3) * 0.45;
    const base = new THREE.Vector3(Math.cos(a) * r, 0.5 + ((i * 37) % 21) / 10, Math.sin(a) * r * 0.55);
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, base, phase: i * 0.7 };
  });

  // ---- Scoop tool + the scooped ball ----
  const tool = new THREE.Group();
  {
    const bowlGeo = new THREE.SphereGeometry(0.58, 28, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const bowlMat = new THREE.MeshToonMaterial({ color: "#E4E9F5", gradientMap, side: THREE.DoubleSide });
    tool.add(inked(new THREE.Mesh(bowlGeo, bowlMat), 0.03));
    const handle = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 10), steel), 0.02);
    handle.position.set(0.95, 0.65, 0);
    handle.rotation.z = -0.9;
    const grip = ink(new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.7, 12), toon("#489CFF")), 0.03);
    grip.position.set(1.62, 1.2, 0);
    grip.rotation.z = -0.9;
    tool.add(handle, grip);
  }
  tool.visible = false;
  tool.scale.setScalar(TOOL_SCALE);
  scene.add(tool);

  const ball = buildBall("#FFC7EA");
  ball.visible = false;
  scene.add(ball);

  // ---- Cone that receives the scoop ----
  const cone = buildCone();
  cone.scale.setScalar(CONE_SCALE);
  cone.visible = false;
  scene.add(cone);

  // ---- Ground shadows ----
  const shadowTex = canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(25,21,59,0.28)");
    g.addColorStop(0.6, "rgba(25,21,59,0.12)");
    g.addColorStop(1, "rgba(25,21,59,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  shadowTex.wrapS = shadowTex.wrapT = THREE.ClampToEdgeWrapping;
  const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const tubShadow = new THREE.Mesh(shadowGeo, shadowMat);
  tubShadow.scale.set(4.6, 1, 4.6);
  tubShadow.position.y = -0.02;
  const coneShadow = new THREE.Mesh(shadowGeo, shadowMat);
  coneShadow.position.set(CONE_X, -0.02, 0);
  scene.add(tubShadow, coneShadow);

  // ---- Floating candy bits ----
  const bitGeos = [
    new THREE.IcosahedronGeometry(0.12, 0),
    new THREE.OctahedronGeometry(0.14, 0),
    new THREE.TorusGeometry(0.1, 0.045, 8, 14),
    new THREE.CapsuleGeometry(0.045, 0.18, 2, 6),
  ];
  const bits = Array.from({ length: 12 }, (_, i) => {
    const mesh = inked(new THREE.Mesh(bitGeos[i % bitGeos.length], toon(BITS[i % BITS.length])), 0.03);
    const a = (i / 12) * Math.PI * 2;
    mesh.position.set(Math.cos(a) * (3.4 + (i % 3) * 0.5), 0.4 + ((i * 53) % 50) / 10, -1.6 - (i % 4) * 0.4);
    scene.add(mesh);
    return { mesh, phase: i * 1.3, baseY: mesh.position.y };
  });

  // ---- Interaction: gentle pointer parallax ----
  const dom = renderer.domElement;
  let parallax = 0;
  let parallaxSmooth = 0;
  const onMove = (e: PointerEvent) => {
    const rect = dom.getBoundingClientRect();
    parallax = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  };
  const onLeave = () => (parallax = 0);
  dom.addEventListener("pointermove", onMove);
  dom.addEventListener("pointerleave", onLeave);

  // ---- Resize / fit ----
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  let distance = 12;
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Fit the whole set (tub + cone + ingredients above) in both dimensions
    distance = Math.max(3.5 / (tanHalfFov * camera.aspect), 2.8 / tanHalfFov) * 1.04;
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // ---- Per-frame update, a pure function of (progress, time) ----
  let target = 0;
  let progress = 0;
  let intro = 0;

  const toolKeys = (tubX: number, surface: number): Key[] => [
    { p: 0.72, x: tubX + 3.6, y: 5.4, r: 0.3 },
    { p: 0.78, x: tubX, y: 3.1, r: 0 },
    { p: 0.81, x: tubX, y: surface + 0.5, r: 0 },
    { p: 0.855, x: tubX, y: 3.2, r: 0 },
    { p: 0.915, x: CONE_X - 0.1, y: BALL_REST_Y + 1.2, r: -0.15 },
    { p: 0.945, x: CONE_X + 0.15, y: BALL_REST_Y + 1.05, r: -1.1 },
    { p: 1.0, x: CONE_X + 2.4, y: 5.6, r: -0.5 },
  ];

  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _c = new THREE.Vector3();

  function update(p: number, time: number) {
    const bob = reducedMotion ? 0 : 1;

    // Tub: pops in on load, then slides left to make room for the cone
    const tubX = lerp(0, TUB_SHIFT, smooth(seg(p, T.shift)));
    const tubScale = Math.max(easeOutBack(clamp01(intro / 0.6)), 0.0001);
    tub.position.set(tubX, 0, 0);
    tub.scale.setScalar(tubScale);
    tubShadow.position.x = tubX;
    tubShadow.scale.setScalar(4.6 * tubScale);

    // Surface level rises as ingredients arrive, dips slightly when scooped
    const level = lerp(SURFACE_EMPTY, SURFACE_FULL, seg(p, [0.1, 0.3])) - 0.07 * seg(p, T.ballAppear);
    let pulse = 0;
    for (let i = 0; i < ingredients.length; i++) {
      const arrive = T.dive.start + i * T.dive.gap + T.dive.dur;
      pulse += Math.max(0, 1 - Math.abs(p - arrive) * 40);
    }
    const appear = easeOutCubic(seg(p, [T.dive.start + T.dive.dur, T.dive.start + T.dive.dur + 0.04]));
    surface.visible = appear > 0.001;
    surface.position.y = level;
    surface.scale.set(Math.max(appear, 0.0001), 1 + pulse * 0.5, Math.max(appear, 0.0001));

    // Batter swirl: blend cream → pink while the whisk turns, frost firms the tub
    const blend = seg(p, T.blend);
    color.copy(CREAM).lerp(PINK, blend);
    sideMat.color.copy(color);
    topMat.color.copy(color);
    const spin = 70 * clamp01((p - 0.25) / 0.27);
    swirl.rotation = -(spin + time * 0.3 * bob);
    const frost = seg(p, T.frost);
    tubMat.color.copy(WHITE).lerp(ICE, frost);

    // Ingredients hover in a ring, then dive into the tub one by one
    ingredients.forEach(({ group, i, spin: rot }) => {
      const start = T.dive.start + i * T.dive.gap;
      const u = seg(p, [start, start + T.dive.dur]);
      const pop = Math.max(easeOutBack(clamp01((intro - i * 0.12) / 0.5)), 0.0001);

      const a = i * ((Math.PI * 2) / 6) + time * 0.25 * bob + 0.4;
      _a.set(tubX + Math.cos(a) * 2.2, 3.1 + Math.sin(time * 1.4 + i) * 0.2 * bob, Math.sin(a) * 1.1);
      _b.set(tubX, level + 0.25, 0);
      _c.set(lerp(_a.x, _b.x, 0.6), Math.max(_a.y, _b.y) + 1.3, 0);
      const e = u * u * (3 - 2 * u);
      group.position.set(
        (1 - e) ** 2 * _a.x + 2 * (1 - e) * e * _c.x + e * e * _b.x,
        (1 - e) ** 2 * _a.y + 2 * (1 - e) * e * _c.y + e * e * _b.y,
        (1 - e) ** 2 * _a.z + 2 * (1 - e) * e * _c.z + e * e * _b.z,
      );
      group.rotation.set(u * rot.x * 5, Math.sin(time * 0.7 + i) * 0.45 * bob + u * rot.y * 7, 0);
      group.scale.setScalar(pop * (1 - smooth(clamp01((u - 0.82) / 0.18))));
      group.visible = u < 1 && pop > 0.001;
    });

    // Whisk dips in, spins, lifts out
    const wIn = smooth(seg(p, T.whiskIn)) * (1 - smooth(seg(p, T.whiskOut)));
    const whiskYIn = level - 0.25;
    whisk.visible = wIn > 0.001;
    whisk.position.set(tubX, whiskYIn + (1 - wIn) * 3.4, 0);
    whisk.rotation.y = spin * 2 + time * 0.8 * bob;

    // Frost crystals bloom around the tub
    crystals.forEach(({ mesh, base, phase }, i) => {
      const s = Math.max(easeOutBack(seg(p, [T.frost[0] + i * 0.006, T.frost[0] + i * 0.006 + 0.08])), 0) * (1 - seg(p, [0.84, 0.9]));
      mesh.visible = s > 0.001;
      mesh.position.set(tubX + base.x, base.y + Math.sin(time * 1.2 + phase) * 0.12 * bob, base.z);
      mesh.rotation.y = time * 0.9 * bob + phase;
      mesh.scale.set(0.6 * s, 1.5 * s, 0.6 * s);
    });

    // Cone arrives from the right
    const coneT = seg(p, T.coneIn);
    cone.visible = coneT > 0.001;
    const coneE = Math.max(easeOutBack(coneT), 0);
    cone.position.set(lerp(6.5, CONE_X, coneE), CONE_LIFT + Math.sin(time * 1.6) * 0.06 * bob, 0);
    cone.rotation.y = (1 - coneE) * 2.5;
    coneShadow.visible = cone.visible;
    coneShadow.position.x = cone.position.x;
    coneShadow.scale.setScalar(2.6 * clamp01(coneT * 1.5));

    // Scoop tool + ball
    const tk = sample(toolKeys(tubX, level), p);
    tool.visible = p > 0.72 && p < 0.999;
    tool.position.set(tk.x, tk.y, 0);
    tool.rotation.z = tk.r;

    const ballIn = easeOutBack(seg(p, T.ballAppear));
    const fall = seg(p, T.release);
    ball.visible = ballIn > 0.001;
    if (fall === 0) {
      ball.position.set(tk.x, tk.y + 0.25, 0);
      ball.scale.setScalar(BALL_SCALE * Math.max(ballIn, 0.0001));
    } else {
      const f = fall * fall;
      const from = sample(toolKeys(tubX, level), T.release[0]);
      ball.position.set(lerp(from.x, CONE_X, f), lerp(from.y + 0.25, BALL_REST_Y, f), 0);
      const u = clamp01((p - T.release[1]) / 0.055);
      const squash = p >= T.release[1] ? -0.3 * Math.exp(-5 * u) * Math.cos(u * 10) : 0;
      ball.scale.set(BALL_SCALE * (1 - squash * 0.5), BALL_SCALE * (1 + squash), BALL_SCALE * (1 - squash * 0.5));
    }
    ball.rotation.y = 0;

    // Candy bits
    bits.forEach(({ mesh, phase, baseY }) => {
      mesh.position.y = baseY + Math.sin(time * 0.8 + phase) * 0.25 * bob;
      mesh.rotation.x += 0.004 * bob;
      mesh.rotation.y += 0.006 * bob;
    });

    // Camera orbits slowly with progress and leans toward the pointer
    parallaxSmooth = THREE.MathUtils.damp(parallaxSmooth, parallax, 4, 1 / 60);
    const az = lerp(-0.28, 0.28, p) + parallaxSmooth * 0.12;
    camera.position.set(Math.sin(az) * distance, TARGET_Y + distance * 0.2, Math.cos(az) * distance);
    camera.lookAt(0, TARGET_Y, 0);
  }

  // ---- Frame loop (runs only while on screen) ----
  const timer = new THREE.Timer();
  timer.connect(document);

  function frame() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    intro += dt;
    progress = THREE.MathUtils.damp(progress, target, 7, dt);
    update(progress, timer.getElapsed());
    renderer.render(scene, camera);
  }

  const visibility = new IntersectionObserver(([entry]) => {
    renderer.setAnimationLoop(entry.isIntersecting ? frame : null);
  });
  visibility.observe(container);

  return {
    setProgress(p) {
      target = clamp01(p);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      visibility.disconnect();
      resizeObserver.disconnect();
      timer.dispose();
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerleave", onLeave);
      renderer.dispose();
      dom.remove();
    },
  };
}
