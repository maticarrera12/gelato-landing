import confetti from "canvas-confetti";
import { addToCart } from "./cart";
import { showToast } from "./toast";
import type { ConeScene } from "./cone-scene";

const MAX_SCOOPS = 3;
const TOPPING_ACTIVE = "bg-candy-mango";
const TOPPING_IDLE = "bg-white";

interface Scoop {
  name: string;
  color: string;
  textClass: string;
}

type ToppingId = "sprinkles" | "cherry" | "cookie";

const toppingIds: ToppingId[] = ["sprinkles", "cherry", "cookie"];

// The 3D view loads lazily; until it is ready (or if WebGL is unavailable) the 2D fallback renders.
let view: ConeScene | null = null;

const scoops: Scoop[] = [];
const toppings: Record<ToppingId, boolean> = { sprinkles: false, cherry: false, cookie: false };

const $ = (id: string) => document.getElementById(id)!;
const toppingElement = (id: ToppingId) => $(`topping${id[0].toUpperCase()}${id.slice(1)}`);
const toppingButton = (id: ToppingId) => document.querySelector<HTMLElement>(`[data-topping="${id}"]`)!;

function syncView() {
  if (!view) return;
  view.setScoops(scoops);
  toppingIds.forEach((id) => view!.setTopping(id, toppings[id]));
}

function render() {
  const stack = $("scoopsStack");
  stack.replaceChildren();
  $("scoopCounterBadge").textContent = `${scoops.length}/${MAX_SCOOPS}`;

  const empty = scoops.length === 0;
  $("emptyNotice").style.display = empty ? "flex" : "none";
  $("flavorListText").textContent = empty ? "Cucurucho Waffle Vacío" : scoops.map((s) => s.name).join(" + ");

  syncView();

  scoops.forEach((scoop, idx) => {
    const div = document.createElement("div");
    div.className = `w-28 h-16 rounded-full border-2 border-candy-ink flex items-center justify-center font-display font-bold text-xs animate-scoop-drop shadow-sm relative ${scoop.textClass}`;
    div.style.backgroundColor = scoop.color;
    div.style.marginTop = idx === 0 ? "0px" : "-22px";
    div.textContent = scoop.name;
    stack.appendChild(div);
  });
}

function addScoop(scoop: Scoop) {
  if (scoops.length >= MAX_SCOOPS) {
    showToast("¡Máximo 3 bochas por cucurucho!");
    return;
  }
  scoops.push(scoop);
  render();
  confetti({ particleCount: 25, spread: 40, origin: { y: 0.7 } });
  showToast(`Sumaste: ${scoop.name}`);
}

function setTopping(id: ToppingId, on: boolean) {
  toppings[id] = on;
  const btn = toppingButton(id);
  btn.classList.toggle(TOPPING_ACTIVE, on);
  btn.classList.toggle(TOPPING_IDLE, !on);
  toppingElement(id).classList.toggle("hidden", !on);
  view?.setTopping(id, on);
}

function toggleTopping(id: ToppingId) {
  setTopping(id, !toppings[id]);
  if (toppings[id]) showToast("¡Topping agregado!");
}

function reset(announce = true) {
  scoops.length = 0;
  toppingIds.forEach((id) => setTopping(id, false));
  render();
  if (announce) showToast("Cono reiniciado");
}

function order() {
  if (scoops.length === 0) {
    showToast("¡Primero agregale al menos 1 bocha!");
    return;
  }
  const count = scoops.length;
  addToCart();
  view?.sendOff();
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  showToast(`¡Cono de ${count} sabores agregado al pedido!`);
  reset(false);
}

function mountScene() {
  const stage = document.getElementById("coneCanvas");
  const section = document.getElementById("creador");
  if (!stage || !section) return;

  const load = () =>
    import("./cone-scene")
      .then(({ createConeScene }) => {
        view = createConeScene(stage, {
          onInteract: () => document.getElementById("coneHint")?.classList.add("opacity-0"),
        });
        $("coneFallback").classList.add("hidden");
        syncView();
      })
      .catch(() => {
        /* WebGL unavailable: the 2D fallback stays */
      });

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      void load();
    },
    { rootMargin: "300px" },
  );
  observer.observe(section);
}

export function initConeBuilder() {
  mountScene();
  document.querySelectorAll<HTMLElement>("[data-scoop-name]").forEach((btn) =>
    btn.addEventListener("click", () =>
      addScoop({
        name: btn.dataset.scoopName!,
        color: btn.dataset.scoopColor!,
        textClass: btn.dataset.scoopText!,
      }),
    ),
  );

  toppingIds.forEach((id) => toppingButton(id).addEventListener("click", () => toggleTopping(id)));
  document.querySelector("[data-reset-cone]")!.addEventListener("click", () => reset());
  document.querySelector("[data-order-cone]")!.addEventListener("click", order);
}
