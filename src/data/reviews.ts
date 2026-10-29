// Demo reviews, not real customers
export const rating = { score: 4.9, count: 1200 };

export const reviews = [
  { name: "Lucía M.", when: "hace 2 semanas", text: "El pistacho menta es el mejor que probé en Buenos Aires. Y el cono con granitas, un sueño.", bg: "bg-candy-mint/40" },
  { name: "Tomás R.", when: "hace 1 mes", text: "Pedimos el carrito para el cumpleaños de mi hija y fue un éxito total. Puntuales y re simpáticos.", bg: "bg-candy-pink/40" },
  { name: "Cami F.", when: "hace 3 semanas", text: "El delivery llegó en 25 minutos y el helado venía perfecto. El pote compostable es un detalle genial.", bg: "bg-candy-blue/15" },
  { name: "Nico B.", when: "hace 1 semana", text: "Las opciones veganas son de verdad ricas, no un sabor de relleno. Volvemos todas las semanas.", bg: "bg-candy-mango/30" },
] as const;
