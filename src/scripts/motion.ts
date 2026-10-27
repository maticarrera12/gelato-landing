/** Strong ease-out, same curve as --ease-out in global.css */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
