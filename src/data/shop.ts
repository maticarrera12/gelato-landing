// Placeholder contact details for the demo shop
export const shop = {
  name: "MIMI & CO.",
  whatsapp: "5491100000000",
  whatsappLabel: "+54 9 11 0000-0000",
  instagram: "mimiandco.gelato",
  address: "Honduras 4820, Palermo Soho, CABA",
  mapEmbed:
    "https://www.openstreetmap.org/export/embed.html?bbox=-58.4310%2C-34.5920%2C-58.4210%2C-34.5850&layer=mapnik&marker=-34.5885%2C-58.4260",
  deliveryApps: [
    { label: "PedidosYa", href: "https://www.pedidosya.com.ar" },
    { label: "Rappi", href: "https://www.rappi.com.ar" },
  ],
} as const;

export const hours = [
  { days: "Lunes a Jueves", time: "12:00 – 00:00" },
  { days: "Viernes y Sábado", time: "12:00 – 02:00" },
  { days: "Domingo", time: "12:00 – 01:00" },
] as const;

export const formats = [
  { id: "cucurucho", label: "Cucurucho", max: 2, price: 4200, icon: "ph-ice-cream" },
  { id: "vaso", label: "Vaso", max: 3, price: 5200, icon: "ph-coffee" },
  { id: "cuarto", label: "1/4 kg", max: 3, price: 9800, icon: "ph-package" },
  { id: "medio", label: "1/2 kg", max: 4, price: 17500, icon: "ph-package" },
  { id: "kilo", label: "1 kg", max: 5, price: 32000, icon: "ph-package" },
] as const;

export const eventTypes = ["Cumpleaños", "Casamiento", "Evento de empresa", "Activación de marca", "Otro"] as const;

// Fake pricing for custom cones from the builder
export const conePricing = { base: 2400, perScoop: 900, perTopping: 300 } as const;
