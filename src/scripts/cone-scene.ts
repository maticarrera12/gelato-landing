import * as THREE from "three";
import { BITS, CHERRY, CONE_H, SCOOP_R, SCOOP_SQUASH, clamp01, canvasTexture, createToonKit, easeOutBack, easeOutCubic } from "./toon-kit";

export interface SceneScoop {
  name: string;
  color: string;
}

export type ToppingId = "sprinkles" | "cherry" | "cookie";

export interface ConeScene {
  setScoops(scoops: readonly SceneScoop[]): void;
  setTopping(id: ToppingId, on: boolean): void;
  /** Hands the finished cone over: it flies away and a fresh empty one pops in. */
  sendOff(): void;
  dispose(): void;
}

interface Options {
  onInteract?: () => void;
}

// ---- Scoop stack layout ----
const SCOOP_STEP = 1.05;
const FIRST_SCOOP_Y = CONE_H + 0.5;

const scoopY = (index: number) => FIRST_SCOOP_Y + index * SCOOP_STEP;

export function createConeScene(container: HTMLElement, options: Options = {}): ConeScene {
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

  // ---- Shared toon look ----
  const { toon, inked, gradientMap, waferTexture, sparkGeo, whiteBasic, buildScoop, buildCone } = createToonKit();

  // ---- Toppings (one "crown" per cone, riding on the top scoop) ----
  const SPRINKLE_COUNT = 70;
  const cherryGeo = new THREE.SphereGeometry(0.27, 24, 18);
  const stemGeo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0.05, 0.5, 0), new THREE.Vector3(0.22, 0.72, 0.02)]),
    10,
    0.025,
    6,
  );
  const waferGeo = new THREE.BoxGeometry(0.44, 1.55, 0.07);
  const sprinkleGeo = new THREE.CapsuleGeometry(0.02, 0.11, 2, 6);
  const sprinkleMat = new THREE.MeshToonMaterial({ gradientMap });

  const topSurfaceY = SCOOP_R * SCOOP_SQUASH;

  interface Crown {
    group: THREE.Group;
    cherry: THREE.Group;
    cookie: THREE.Group;
    sprinkles: THREE.InstancedMesh;
    sprinkleData: { pos: THREE.Vector3; quat: THREE.Quaternion; delay: number }[];
    amount: Record<ToppingId, number>;
  }

  function buildCrown(): Crown {
    const group = new THREE.Group();

    const cherry = new THREE.Group();
    const fruit = inked(new THREE.Mesh(cherryGeo, toon(CHERRY)), 0.035);
    const stem = new THREE.Mesh(stemGeo, toon("#2F7D4F"));
    const shine = new THREE.Mesh(sparkGeo, whiteBasic);
    shine.position.set(-0.1, 0.12, 0.2);
    fruit.add(stem, shine);
    fruit.position.y = 0.2;
    cherry.add(fruit);
    cherry.position.y = topSurfaceY - 0.05;

    const cookie = new THREE.Group();
    const wafer = inked(new THREE.Mesh(waferGeo, toon("#ffffff", waferTexture)), 0.03);
    wafer.position.y = 0.45;
    cookie.add(wafer);
    cookie.position.set(0.42, topSurfaceY - 0.28, 0.1);
    cookie.rotation.set(0.1, 0.3, -0.5);

    const sprinkles = new THREE.InstancedMesh(sprinkleGeo, sprinkleMat, SPRINKLE_COUNT);
    const sprinkleData: Crown["sprinkleData"] = [];
    const color = new THREE.Color();
    const up = new THREE.Vector3(0, 1, 0);
    const maxPolar = 1.05;
    for (let i = 0; i < SPRINKLE_COUNT; i++) {
      // Uniform over the cap of the top scoop
      const polar = Math.acos(1 - Math.random() * (1 - Math.cos(maxPolar)));
      const azimuth = Math.random() * Math.PI * 2;
      const normal = new THREE.Vector3(
        Math.sin(polar) * Math.cos(azimuth),
        Math.cos(polar),
        Math.sin(polar) * Math.sin(azimuth),
      );
      const pos = new THREE.Vector3(normal.x * SCOOP_R, normal.y * SCOOP_R * SCOOP_SQUASH, normal.z * SCOOP_R).addScaledVector(normal, 0.02);
      const tangent = new THREE.Vector3().crossVectors(normal, new THREE.Vector3().randomDirection()).normalize();
      sprinkleData.push({ pos, quat: new THREE.Quaternion().setFromUnitVectors(up, tangent), delay: Math.random() });
      sprinkles.setColorAt(i, color.set(BITS[i % BITS.length]));
    }
    sprinkles.frustumCulled = false;

    group.add(cherry, cookie, sprinkles);
    return { group, cherry, cookie, sprinkles, sprinkleData, amount: { sprinkles: 0, cherry: 0, cookie: 0 } };
  }

  const _m = new THREE.Matrix4();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();

  function applyCrown(c: Crown, hasScoops: boolean) {
    const a = c.amount;
    c.cherry.visible = hasScoops && a.cherry > 0;
    c.cookie.visible = hasScoops && a.cookie > 0;
    c.sprinkles.visible = hasScoops && a.sprinkles > 0;

    const cherryT = clamp01(a.cherry);
    c.cherry.scale.setScalar(Math.max(easeOutBack(cherryT), 0.0001));
    c.cherry.position.y = topSurfaceY - 0.05 + (1 - cherryT) * 1.6;

    const cookieT = clamp01(a.cookie);
    c.cookie.scale.setScalar(Math.max(easeOutCubic(cookieT), 0.0001));
    c.cookie.position.y = topSurfaceY - 0.28 + (1 - cookieT) * 1.4;

    if (c.sprinkles.visible) {
      const t = clamp01(a.sprinkles);
      c.sprinkleData.forEach((d, i) => {
        const p = easeOutCubic(clamp01((t - d.delay * 0.5) / 0.5));
        _p.copy(d.pos);
        _p.y += (1 - p) * 2.4;
        _s.setScalar(p > 0 ? 1 : 0.0001);
        _m.compose(_p, d.quat, _s);
        c.sprinkles.setMatrixAt(i, _m);
      });
      c.sprinkles.instanceMatrix.needsUpdate = true;
    }
  }

  // ---- Ice-cream assembly ----
  interface ScoopEntry {
    group: THREE.Group;
    y: number;
    vy: number;
    target: number;
    landed: boolean;
    squash: number;
    squashV: number;
    scale: number;
    leaving: boolean;
  }

  interface Ice {
    group: THREE.Group;
    scoopsGroup: THREE.Group;
    crown: Crown;
    crownY: number;
    scoops: ScoopEntry[];
    spawn: number; // 0 → 1 pop-in
    spawnDelay: number;
  }

  function buildIce(spawnDelay = 0): Ice {
    const group = new THREE.Group();
    const scoopsGroup = new THREE.Group();
    const crown = buildCrown();
    group.add(buildCone(), scoopsGroup, crown.group);
    crown.group.position.y = FIRST_SCOOP_Y;
    return {
      group,
      scoopsGroup,
      crown,
      crownY: FIRST_SCOOP_Y,
      scoops: [],
      spawn: spawnDelay > 0 ? 0 : 1,
      spawnDelay,
    };
  }

  const wanted: Record<ToppingId, boolean> = { sprinkles: false, cherry: false, cookie: false };
  let ice = buildIce();
  scene.add(ice.group);

  interface Departing {
    group: THREE.Group;
    t: number;
  }
  const departing: Departing[] = [];

  // Ground shadow (stays put while the cone floats above it)
  const shadowTex = canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(25,21,59,0.28)");
    g.addColorStop(0.6, "rgba(25,21,59,0.12)");
    g.addColorStop(1, "rgba(25,21,59,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
  shadowTex.wrapS = shadowTex.wrapT = THREE.ClampToEdgeWrapping;
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.position.y = -0.75;
  scene.add(shadow);

  // Floating candy bits drifting behind the cone
  const bitGeos = [
    new THREE.IcosahedronGeometry(0.13, 0),
    new THREE.OctahedronGeometry(0.15, 0),
    new THREE.TorusGeometry(0.11, 0.05, 8, 14),
    new THREE.CapsuleGeometry(0.05, 0.2, 2, 6),
  ];
  const bits = new THREE.Group();
  const bitData: { mesh: THREE.Mesh; baseY: number; speed: number; phase: number; spin: THREE.Vector3 }[] = [];
  for (let i = 0; i < 14; i++) {
    const mesh = inked(new THREE.Mesh(bitGeos[i % bitGeos.length], toon(BITS[i % BITS.length])), 0.03);
    const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
    const radius = 2.1 + Math.random() * 1.4;
    mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius * 0.6 - 1.2);
    bits.add(mesh);
    bitData.push({
      mesh,
      baseY: 0.5 + Math.random() * 4.6,
      speed: 0.5 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(1.4),
    });
  }
  scene.add(bits);

  // ---- Public mutations ----
  function addScoopEntry(target: Ice, index: number, color: string) {
    const group = buildScoop(color);
    const y = scoopY(index);
    group.position.y = y + 5;
    target.scoopsGroup.add(group);
    target.scoops.push({ group, y: y + 5, vy: 0, target: y, landed: false, squash: 0, squashV: 0, scale: 1, leaving: false });
    // Toppings replay once the new scoop has landed
    (Object.keys(wanted) as ToppingId[]).forEach((id) => {
      if (wanted[id]) target.crown.amount[id] = -0.5;
    });
  }

  function setScoops(list: readonly SceneScoop[]) {
    const live = ice.scoops.filter((s) => !s.leaving);
    for (let i = live.length; i < list.length; i++) addScoopEntry(ice, i, list[i].color);
    for (let i = list.length; i < live.length; i++) live[i].leaving = true;
  }

  function setTopping(id: ToppingId, on: boolean) {
    wanted[id] = on;
  }

  function sendOff() {
    departing.push({ group: ice.group, t: 0 });
    ice = buildIce(0.25);
    scene.add(ice.group);
  }

  // ---- Interaction: drag to spin, tap a scoop to boop it ----
  const dom = renderer.domElement;
  let rotY = 0.45;
  let spinVel = 0;
  let dragging = false;
  let lastX = 0;
  let lastT = 0;
  let moved = 0;
  let idle = 0;
  let parallax = 0;
  let parallaxSmooth = 0;
  let interacted = false;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const markInteracted = () => {
    if (interacted) return;
    interacted = true;
    options.onInteract?.();
  };

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    lastT = performance.now();
    moved = 0;
    spinVel = 0;
    idle = 0;
    dom.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const rect = dom.getBoundingClientRect();
    parallax = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const now = performance.now();
    rotY += dx * 0.012;
    spinVel = THREE.MathUtils.clamp((dx * 0.012) / Math.max((now - lastT) / 1000, 0.008), -9, 9);
    lastX = e.clientX;
    lastT = now;
    moved += Math.abs(dx);
    idle = 0;
    if (moved > 6) markInteracted();
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    if (moved < 6) boop(e);
  };
  const onLeave = () => {
    parallax = 0;
  };

  function boop(e: PointerEvent) {
    const rect = dom.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(ice.scoopsGroup.children, true)[0];
    if (!hit) return;
    let node: THREE.Object3D | null = hit.object;
    while (node && node.parent !== ice.scoopsGroup) node = node.parent;
    const entry = ice.scoops.find((s) => s.group === node);
    if (entry && entry.landed) {
      entry.squash = -0.24;
      entry.squashV = 0;
      markInteracted();
    }
  }

  dom.addEventListener("pointerdown", onDown);
  dom.addEventListener("pointermove", onMove);
  dom.addEventListener("pointerup", onUp);
  dom.addEventListener("pointercancel", onUp);
  dom.addEventListener("pointerleave", onLeave);

  // ---- Framing: camera eases to keep the whole stack in view ----
  let frameCenter = 2.1;
  let frameDistance = 14;
  const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  function frameTarget() {
    const live = ice.scoops.filter((s) => !s.leaving).length;
    const headroom = wanted.cookie ? 1.6 : wanted.cherry ? 1.15 : 0.6;
    const top = live === 0 ? CONE_H + 1.1 : scoopY(live - 1) + topSurfaceY + headroom;
    const bottom = -0.9;
    const height = top - bottom;
    const aspect = camera.aspect;
    // Fit both height and width (stack is ~2.4 wide)
    const dist = Math.max(height / (2 * tanHalfFov), 3.2 / (2 * tanHalfFov * aspect));
    return { center: (top + bottom) / 2, dist: dist * 1.04 };
  }

  // ---- Resize ----
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  {
    const f = frameTarget();
    frameCenter = f.center;
    frameDistance = f.dist;
  }

  // ---- Frame loop ----
  const timer = new THREE.Timer();
  timer.connect(document);
  const lookAt = new THREE.Vector3();

  function stepScoops(target: Ice, dt: number) {
    for (let i = target.scoops.length - 1; i >= 0; i--) {
      const s = target.scoops[i];

      if (s.leaving) {
        s.scale -= dt * 5;
        if (s.scale <= 0) {
          target.scoopsGroup.remove(s.group);
          target.scoops.splice(i, 1);
          continue;
        }
      }

      // Underdamped spring toward the stack slot → a little bounce on arrival
      const accel = (s.target - s.y) * 90 - s.vy * 14;
      s.vy += accel * dt;
      s.y += s.vy * dt;
      if (!s.landed && s.y <= s.target) {
        s.landed = true;
        s.squash = -0.3;
        s.squashV = 0;
      }
      // Squash & stretch spring, volume-preserving
      s.squashV += (-s.squash * 220 - s.squashV * 9) * dt;
      s.squash += s.squashV * dt;

      s.group.position.y = s.y;
      const k = Math.max(s.scale, 0.0001);
      s.group.scale.set((1 - s.squash * 0.5) * k, (1 + s.squash) * k, (1 - s.squash * 0.5) * k);
    }
  }

  function stepCrown(target: Ice, dt: number) {
    const live = target.scoops.filter((s) => !s.leaving).length;
    const wantY = scoopY(Math.max(live - 1, 0));
    // The crown follows the top scoop's actual height so toppings ride the bounce
    const topEntry = target.scoops.filter((s) => !s.leaving).at(-1);
    const follow = topEntry ? topEntry.y : wantY;
    target.crownY = follow;
    target.crown.group.position.y = follow;
    if (topEntry) {
      target.crown.group.scale.set(topEntry.group.scale.x, topEntry.group.scale.y, topEntry.group.scale.z);
    }

    (Object.keys(wanted) as ToppingId[]).forEach((id) => {
      const goal = wanted[id] && live > 0 ? 1 : 0;
      const a = target.crown.amount[id];
      const speed = goal === 1 ? 2.2 : 3.2;
      target.crown.amount[id] = goal > a ? Math.min(a + dt * speed, goal) : Math.max(a - dt * speed, goal);
    });
    applyCrown(target.crown, live > 0);
  }

  function frame() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const time = timer.getElapsed();

    // Rotation: drag → inertia → gentle idle spin
    idle += dt;
    if (!dragging) {
      rotY += spinVel * dt;
      spinVel *= Math.exp(-3 * dt);
      // After a pause, ease back to facing the viewer with a slow sway so the faces stay visible
      if (idle > 1.2 && Math.abs(spinVel) < 0.15) {
        const turns = Math.round(rotY / (Math.PI * 2)) * Math.PI * 2;
        const sway = reducedMotion ? 0 : Math.sin(time * 0.7) * 0.45;
        rotY = THREE.MathUtils.damp(rotY, turns + sway, 2.5, dt);
      }
    }
    parallaxSmooth = THREE.MathUtils.damp(parallaxSmooth, parallax, 4, dt);

    // Camera framing
    const f = frameTarget();
    frameCenter = THREE.MathUtils.damp(frameCenter, f.center, 4, dt);
    frameDistance = THREE.MathUtils.damp(frameDistance, f.dist, 4, dt);
    camera.position.set(parallaxSmooth * 0.8, frameCenter + frameDistance * 0.12, frameDistance);
    lookAt.set(0, frameCenter, 0);
    camera.lookAt(lookAt);

    // Active cone
    const bob = reducedMotion ? 0 : Math.sin(time * 1.6) * 0.07;
    if (ice.spawn < 1) {
      ice.spawnDelay = Math.max(ice.spawnDelay - dt, 0);
      if (ice.spawnDelay === 0) ice.spawn = Math.min(ice.spawn + dt * 2.2, 1);
    }
    const spawnScale = Math.max(easeOutBack(ice.spawn), 0.0001);
    ice.group.scale.setScalar(spawnScale);
    ice.group.position.y = bob;
    ice.group.rotation.y = rotY;
    stepScoops(ice, dt);
    stepCrown(ice, dt);
    shadow.scale.setScalar((1 - bob * 1.2) * spawnScale);

    // Cones on their way out
    for (let i = departing.length - 1; i >= 0; i--) {
      const d = departing[i];
      d.t += dt / 0.9;
      const t = d.t;
      d.group.position.y = bob + t * t * 11;
      d.group.rotation.y = rotY + t * 12;
      d.group.scale.setScalar(Math.max(1 - t * 0.35, 0.0001));
      if (t >= 1) {
        scene.remove(d.group);
        departing.splice(i, 1);
      }
    }

    // Candy bits
    for (const b of bitData) {
      b.mesh.position.y = b.baseY + Math.sin(time * b.speed + b.phase) * 0.25;
      if (!reducedMotion) {
        b.mesh.rotation.x += b.spin.x * dt;
        b.mesh.rotation.y += b.spin.y * dt;
        b.mesh.rotation.z += b.spin.z * dt;
      }
    }
    bits.rotation.y = rotY * 0.18 + parallaxSmooth * 0.15;
    bits.position.y = frameCenter - 2.4;

    renderer.render(scene, camera);
  }

  // Only run while on screen
  const visibility = new IntersectionObserver(([entry]) => {
    renderer.setAnimationLoop(entry.isIntersecting ? frame : null);
  });
  visibility.observe(container);

  return {
    setScoops,
    setTopping,
    sendOff,
    dispose() {
      renderer.setAnimationLoop(null);
      visibility.disconnect();
      resizeObserver.disconnect();
      timer.dispose();
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointercancel", onUp);
      dom.removeEventListener("pointerleave", onLeave);
      renderer.dispose();
      dom.remove();
    },
  };
}
