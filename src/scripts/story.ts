import { storySteps } from "../data/story";
import type { ProcessScene } from "./process-scene";

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

export function initStory() {
  const section = document.querySelector<HTMLElement>("[data-story]");
  const pin = document.querySelector<HTMLElement>("[data-story-pin]");
  const stage = document.getElementById("storyCone");
  if (!section || !pin || !stage) return;

  const steps = [...section.querySelectorAll<HTMLElement>("[data-story-step]")];
  const tints = [...section.querySelectorAll<HTMLElement>("[data-story-tint]")];
  const fills = [...section.querySelectorAll<HTMLElement>("[data-story-fill]")];
  const total = storySteps.length;

  let view: ProcessScene | null = null;
  let currentStep = -1;
  let progress = 0;

  // Scroll distance inside the pinned range, as 0 → 1
  function readProgress() {
    const rect = section!.getBoundingClientRect();
    const pinTop = parseFloat(getComputedStyle(pin!).top) || 0;
    const range = rect.height - pin!.offsetHeight;
    return range > 0 ? clamp01((pinTop - rect.top) / range) : 0;
  }

  function render() {
    progress = readProgress();
    view?.setProgress(progress);

    fills.forEach((fill, i) => {
      fill.style.transform = `scaleX(${clamp01(progress * total - i)})`;
    });

    const step = Math.min(Math.floor(progress * total), total - 1);
    if (step === currentStep) return;
    currentStep = step;
    steps.forEach((el, i) => {
      const on = i === step;
      el.dataset.active = String(on);
      el.setAttribute("aria-hidden", String(!on));
    });
    tints.forEach((el, i) => {
      el.classList.toggle("opacity-0", i !== step);
      el.classList.toggle("opacity-100", i === step);
    });
  }

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      render();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  // Lazy-load the scene when the section is about to be seen
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      import("./process-scene")
        .then(({ createProcessScene }) => {
          view = createProcessScene(stage);
          document.getElementById("storyFallback")?.classList.add("hidden");
          view.setProgress(readProgress());
        })
        .catch(() => {
          /* WebGL unavailable: the static illustration stays */
        });
    },
    { rootMargin: "400px" },
  );
  observer.observe(section);

  render();
}
