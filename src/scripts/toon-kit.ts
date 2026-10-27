import * as THREE from "three";

// Palette mirrors the @theme tokens in global.css
export const INK = "#19153B";
export const CHERRY = "#EE4A25";
export const BITS = ["#FFC7EA", "#489CFF", "#C6FFCA", "#FFC655"];
const MANGO = "#FFC655";
const WAFFLE_DARK = "#E0993A";
const WAFER = "#F3DDAE";

// ---- Cone / scoop proportions, in scene units (cone tip sits at y = 0) ----
export const CONE_H = 2.4;
export const CONE_R = 0.92;
export const SCOOP_R = 0.95;
export const SCOOP_SQUASH = 0.92;

// ---- Small helpers ----
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
export const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

export function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d")!, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function gridTexture(base: string, line: string, lineWidth: number) {
  return canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = line;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    // Diagonals pass through the tile corners so the pattern repeats seamlessly
    ctx.moveTo(0, 0);
    ctx.lineTo(s, s);
    ctx.moveTo(s, 0);
    ctx.lineTo(0, s);
    ctx.moveTo(-s / 2, s / 2);
    ctx.lineTo(s / 2, s * 1.5);
    ctx.moveTo(s / 2, -s / 2);
    ctx.lineTo(s * 1.5, s / 2);
    ctx.stroke();
  });
}

/**
 * Neo-pop building blocks shared by every 3D scene: toon material with a stepped
 * gradient, inverted-hull ink outline, and the scoop / cone models.
 * One kit per renderer, so GPU resources are never shared across contexts.
 */
export function createToonKit() {
  const gradientMap = new THREE.DataTexture(new Uint8Array([150, 210, 255]), 3, 1, THREE.RedFormat);
  gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;

  const toonCache = new Map<string, THREE.MeshToonMaterial>();
  const toon = (color: string, map?: THREE.Texture) => {
    const id = color + (map?.uuid ?? "");
    let mat = toonCache.get(id);
    if (!mat) {
      mat = new THREE.MeshToonMaterial({ color, gradientMap, map: map ?? null, side: map ? THREE.DoubleSide : THREE.FrontSide });
      toonCache.set(id, mat);
    }
    return mat;
  };

  // Inverted-hull outline: back faces pushed out along their normals, drawn in ink.
  const outlineCache = new Map<number, THREE.ShaderMaterial>();
  const outlineMaterial = (thickness: number) => {
    let mat = outlineCache.get(thickness);
    if (!mat) {
      mat = new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(INK) }, uThickness: { value: thickness } },
        vertexShader: /* glsl */ `
          uniform float uThickness;
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uThickness, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          void main() {
            gl_FragColor = vec4(uColor, 1.0);
            #include <colorspace_fragment>
          }`,
        side: THREE.BackSide,
      });
      outlineCache.set(thickness, mat);
    }
    return mat;
  };
  const inked = <T extends THREE.Mesh>(mesh: T, thickness = 0.05): T => {
    mesh.add(new THREE.Mesh(mesh.geometry, outlineMaterial(thickness)));
    return mesh;
  };

  const waffleTexture = gridTexture(MANGO, WAFFLE_DARK, 7);
  waffleTexture.repeat.set(7, 3);
  const waferTexture = gridTexture(WAFER, "#D8B26C", 5);
  waferTexture.repeat.set(1, 3);

  // ---- Shared geometry ----
  const scoopGeo = new THREE.SphereGeometry(SCOOP_R, 40, 28);

  const skirtGeo = new THREE.TorusGeometry(0.86, 0.2, 14, 72);
  skirtGeo.rotateX(Math.PI / 2);
  {
    // Scalloped, melted-looking base
    const pos = skirtGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const angle = Math.atan2(pos.getZ(i), pos.getX(i));
      pos.setY(i, pos.getY(i) + Math.sin(angle * 7) * 0.09);
    }
    skirtGeo.computeVertexNormals();
  }

  const coneGeo = new THREE.ConeGeometry(CONE_R, CONE_H, 48, 1, true);
  coneGeo.rotateX(Math.PI); // tip down
  const rimGeo = new THREE.TorusGeometry(CONE_R, 0.075, 12, 48);
  rimGeo.rotateX(Math.PI / 2);

  const eyeGeo = new THREE.SphereGeometry(0.075, 14, 14);
  const sparkGeo = new THREE.SphereGeometry(0.026, 8, 8);
  const blushGeo = new THREE.CircleGeometry(0.1, 20);
  const smileGeo = new THREE.TorusGeometry(0.1, 0.024, 8, 20, Math.PI);
  smileGeo.rotateZ(Math.PI); // arc opens upward → smile
  const inkBasic = new THREE.MeshBasicMaterial({ color: INK });
  const whiteBasic = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const blushMat = new THREE.MeshBasicMaterial({ color: "#FF7FB6", transparent: true, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2 });

  // ---- Builders ----
  const surfaceZ = (x: number, y: number) =>
    Math.sqrt(Math.max(SCOOP_R ** 2 - x ** 2 - (y / SCOOP_SQUASH) ** 2, 0));

  function buildFace() {
    const face = new THREE.Group();
    for (const side of [-1, 1]) {
      const ex = side * 0.3;
      const ey = 0.14;
      const eye = new THREE.Mesh(eyeGeo, inkBasic);
      eye.position.set(ex, ey, surfaceZ(ex, ey) - 0.02);
      eye.scale.set(1, 1.3, 0.55);
      face.add(eye);

      const spark = new THREE.Mesh(sparkGeo, whiteBasic);
      spark.position.set(ex + 0.025, ey + 0.05, surfaceZ(ex, ey) + 0.03);
      face.add(spark);

      const bx = side * 0.56;
      const by = -0.04;
      const blush = new THREE.Mesh(blushGeo, blushMat);
      blush.position.set(bx, by, surfaceZ(bx, by) + 0.01);
      blush.lookAt(blush.position.clone().multiplyScalar(2));
      face.add(blush);
    }
    const smile = new THREE.Mesh(smileGeo, inkBasic);
    smile.position.set(0, -0.03, surfaceZ(0, -0.03) + 0.01);
    face.add(smile);
    return face;
  }

  function buildScoop(color: string) {
    const group = new THREE.Group();
    const mat = toon(color);
    const body = inked(new THREE.Mesh(scoopGeo, mat));
    body.scale.y = SCOOP_SQUASH;
    const skirt = inked(new THREE.Mesh(skirtGeo, mat), 0.04);
    skirt.position.y = -0.42;
    group.add(body, skirt, buildFace());
    return group;
  }

  function buildCone() {
    const group = new THREE.Group();
    const cone = inked(new THREE.Mesh(coneGeo, toon("#ffffff", waffleTexture)), 0.05);
    cone.position.y = CONE_H / 2;
    const rim = inked(new THREE.Mesh(rimGeo, toon("#F2B13F")), 0.04);
    rim.position.y = CONE_H;
    group.add(cone, rim);
    return group;
  }


  function buildBall(color: string) {
    const group = new THREE.Group();
    const body = inked(new THREE.Mesh(scoopGeo, toon(color)));
    body.scale.y = SCOOP_SQUASH;
    group.add(body, buildFace());
    return group;
  }

  return { gradientMap, toon, inked, outlineMaterial, waferTexture, sparkGeo, whiteBasic, buildFace, buildScoop, buildBall, buildCone };
}
