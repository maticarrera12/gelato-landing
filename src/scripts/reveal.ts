import { EASE_OUT, prefersReducedMotion } from "./motion";

/**
 * Scroll reveals, played once per element. Declarative via data attributes:
 *   data-reveal="up|left|right|scale|pop|clip|fade|words"
 *   data-reveal-delay="ms"                       extra delay
 *   data-reveal-group data-stagger="ms" data-base="ms"   on a parent: children stagger by index
 * Uses WAAPI (transform / opacity / clip-path only), so Tailwind hover transitions are untouched.
 */

type Preset = { frames: Keyframe[]; duration: number };

const PRESETS: Record<string, Preset> = {
  up: { frames: [{ opacity: 0, transform: "translateY(28px)" }, { opacity: 1, transform: "none" }], duration: 600 },
  left: { frames: [{ opacity: 0, transform: "translateX(-32px)" }, { opacity: 1, transform: "none" }], duration: 600 },
  right: { frames: [{ opacity: 0, transform: "translateX(32px)" }, { opacity: 1, transform: "none" }], duration: 600 },
  scale: { frames: [{ opacity: 0, transform: "scale(0.95) translateY(16px)" }, { opacity: 1, transform: "none" }], duration: 700 },
  // Playful overshoot for chips and buttons; never starts from scale(0)
  pop: {
    frames: [
      { opacity: 0, transform: "scale(0.86)" },
      { opacity: 1, transform: "scale(1.04)", offset: 0.6 },
      { opacity: 1, transform: "scale(1)" },
    ],
    duration: 520,
  },
  // Wipe from the top, like an image uncovering
  clip: { frames: [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }], duration: 700 },
  fade: { frames: [{ opacity: 0 }, { opacity: 1 }], duration: 500 },
};

const WORD_STAGGER = 70;

/** Wraps each word in a masked line so it can rise into place. */
function splitWords(el: HTMLElement) {
  const text = el.textContent ?? "";
  el.setAttribute("aria-label", text.trim());
  el.replaceChildren(
    ...text.split(/(\s+)/).map((part) => {
      if (!part.trim()) return document.createTextNode(part);
      const mask = document.createElement("span");
      mask.setAttribute("aria-hidden", "true");
      // Padding/negative margin keeps descenders from being clipped by the mask
      mask.className = "inline-block overflow-hidden align-bottom py-[0.1em] -my-[0.1em]";
      const word = document.createElement("span");
      word.className = "inline-block";
      word.textContent = part;
      mask.append(word);
      return mask;
    }),
  );
}

function delayOf(el: HTMLElement) {
  return Number(el.dataset.revealDelay ?? 0) + Number(el.dataset.revealBase ?? 0) + Number(el.dataset.revealIndex ?? 0) * Number(el.dataset.revealStagger ?? 0);
}

function play(el: HTMLElement) {
  if (el.dataset.revealed) return;
  const type = el.dataset.reveal ?? "up";
  const delay = delayOf(el);
  el.dataset.revealed = "true";

  if (type === "words") {
    const words = [...el.querySelectorAll<HTMLElement>(":scope > span > span")];
    words.forEach((word, i) =>
      word.animate([{ transform: "translateY(105%)" }, { transform: "translateY(0)" }], {
        duration: 650,
        delay: delay + i * WORD_STAGGER,
        easing: EASE_OUT,
        fill: "backwards",
      }),
    );
    return;
  }

  const preset = PRESETS[type] ?? PRESETS.up;
  el.animate(preset.frames, { duration: preset.duration, delay, easing: EASE_OUT, fill: "backwards" });
}

/** Marks an element as already shown (e.g. a filtered card that was hidden when the observer ran). */
export function markRevealed(el: HTMLElement) {
  el.dataset.revealed = "true";
}

export function initReveal() {
  // Content stays fully visible when motion is reduced (the CSS pre-hide only applies without it)
  if (prefersReducedMotion()) return;

  document.querySelectorAll<HTMLElement>("[data-reveal-group]").forEach((group) => {
    const stagger = group.dataset.stagger ?? "60";
    const base = group.dataset.base ?? "0";
    group.querySelectorAll<HTMLElement>(":scope > [data-reveal]").forEach((child, i) => {
      child.dataset.revealIndex = String(i);
      child.dataset.revealStagger = stagger;
      child.dataset.revealBase = base;
    });
  });

  const targets = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
  targets.filter((el) => el.dataset.reveal === "words").forEach(splitWords);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        play(entry.target as HTMLElement);
      }
    },
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
  );
  targets.forEach((el) => observer.observe(el));
}
