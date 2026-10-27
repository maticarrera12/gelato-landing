export const scoopFlavors = [
  { name: "Chicle Bubblegum", short: "Bubblegum", sub: "#FFC7EA", color: "#FFC7EA", textClass: "text-candy-ink", dot: "bg-candy-pink", btn: "bg-candy-pink/25 hover:bg-candy-pink", subClass: "text-candy-ink/70" },
  { name: "Crema de Cielo", short: "Sky Pop", sub: "#489CFF", color: "#489CFF", textClass: "text-white", dot: "bg-candy-blue", btn: "bg-candy-blue/20 hover:bg-candy-blue hover:text-white", subClass: "opacity-80" },
  { name: "Menta Pistacho", short: "Pistacho Mint", sub: "#C6FFCA", color: "#C6FFCA", textClass: "text-candy-ink", dot: "bg-candy-mint", btn: "bg-candy-mint/40 hover:bg-candy-mint", subClass: "text-candy-ink/70" },
  { name: "Mango Tropical", short: "Mango Honey", sub: "#FFC655", color: "#FFC655", textClass: "text-candy-ink", dot: "bg-candy-mango", btn: "bg-candy-mango/30 hover:bg-candy-mango", subClass: "text-candy-ink/70" },
  { name: "Frutilla Malvavisco", short: "Marshmallow", sub: "Frutilla", color: "#FF9ECF", textClass: "text-candy-ink", dot: "bg-candy-strawberry", btn: "bg-pink-100 hover:bg-pink-200", subClass: "text-candy-ink/70" },
  { name: "Dulce de Leche Crunchy", short: "DDL Crunchy", sub: "Toffee", color: "#E2A03F", textClass: "text-white", dot: "bg-candy-toffee", btn: "bg-amber-100 hover:bg-amber-200", subClass: "text-candy-ink/70" },
] as const;

export const toppings = [
  { id: "sprinkles", label: "Granitas Arcoíris", icon: "ph-confetti" },
  { id: "cherry", label: "Cereza al Marrasquino", icon: "ph-cherries" },
  { id: "cookie", label: "Oblea Crocante", icon: "ph-cookie" },
] as const;

export const catalog = [
  { name: "Bubblegum Dream", cat: "cremosos", price: 1400, hex: "#FFC7EA", delay: "0s", sweetness: 9, desc: "Crema batida infusionada con notas de chicle clásico y trocitos de merengue seco.", panel: "bg-candy-pink", hexTag: "bg-candy-ink text-candy-pink", badge: "Best Seller", badgeClass: "text-candy-ink bg-white/70 backdrop-blur-sm" },
  { name: "Blueberry Cloud", cat: "cremosos", price: 1500, hex: "#489CFF", delay: "1s", sweetness: 7, desc: "La mítica crema del cielo pero real: espirulina azul natural con crumble de arándanos.", panel: "bg-candy-blue text-white", hexTag: "bg-white text-candy-blue", badge: "Nostalgia", badgeClass: "text-candy-ink bg-candy-mint" },
  { name: "Pistacho Menta", title: "Pistacho Menta Fresh", cat: "veganos", price: 1700, hex: "#C6FFCA", delay: "2s", sweetness: 6, desc: "Pasta pura de pistachos tostados de Sicilia con hojas de menta fresca machacada.", panel: "bg-candy-mint", hexTag: "bg-candy-ink text-candy-mint", badge: "100% Vegano", badgeClass: "text-white bg-candy-blue" },
  { name: "Mango & Maracuyá", cat: "frutales", price: 1400, hex: "#FFC655", delay: "0.5s", sweetness: 7, desc: "Sorbete ultra refrescante a base de agua, mangos maduros y pulpa ácida de maracuyá.", panel: "bg-candy-mango", hexTag: "bg-candy-ink text-candy-mango", badge: "Sorbet Puro", badgeClass: "text-candy-ink bg-candy-pink" },
] as const;

export const categories = [
  { id: "todos", label: "Todos", hover: "" },
  { id: "cremosos", label: "Cremosos", hover: "hover:bg-candy-pink" },
  { id: "frutales", label: "Frutales", hover: "hover:bg-candy-mint" },
  { id: "veganos", label: "Veganos", hover: "hover:bg-candy-blue hover:text-white" },
] as const;

export const moods = [
  { id: "chill", icon: "ph-flower-lotus", label: "Zen / Chill", hover: "hover:bg-candy-mint", title: "Dúo Relax: Pistacho Menta + Mango Sorbet", desc: "Fresco, liviano y aromático. Te baja las pulsaciones y te transporta a una tarde de pileta sin celular." },
  { id: "party", icon: "ph-lightning", label: "Fiesta / Full", hover: "hover:bg-candy-blue hover:text-white", title: "Dúo Explosivo: Bubblegum + Crema del Cielo + Granitas", desc: "Azúcar, energía pura y colores radioactivos. Perfecto para levantar el día con serotonina líquida." },
  { id: "romance", icon: "ph-heart", label: "Romántico", hover: "hover:bg-candy-pink", title: "Dúo Sweet: Frutilla Marshmallow + DDL Crunchy", desc: "Ultra cremoso, reconfortante y goloso. El abrazo dulce ideal para compartir de a dos." },
  { id: "creative", icon: "ph-paint-brush-broad", label: "Creativo", hover: "hover:bg-candy-mango", title: "Dúo Exótico: Mango Maracuyá + Pistacho Tostado", desc: "Contraste de acidez tropical y crocancia salina para despertar las papilas y destrabar ideas." },
] as const;
