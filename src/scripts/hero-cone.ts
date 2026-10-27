import { scoopFlavors } from "../data/flavors";

const [pink, blue] = scoopFlavors;

export function initHeroCone() {
  const stage = document.getElementById("heroCone");
  if (!stage) return;

  import("./cone-scene")
    .then(({ createConeScene }) => {
      const scene = createConeScene(stage);
      document.getElementById("heroConeFallback")?.classList.add("hidden");

      // Build the "Cotton Cloud Cone" one piece at a time so the drops read as an intro
      const first = { name: pink.name, color: pink.color };
      const second = { name: blue.name, color: blue.color };
      scene.setScoops([first]);
      setTimeout(() => scene.setScoops([first, second]), 450);
      setTimeout(() => scene.setTopping("cherry", true), 1200);
    })
    .catch(() => {
      /* WebGL unavailable: the 2D illustration stays */
    });
}
