export const demoCustomer = {
  id: "60000000-0000-4000-8000-000000000001",
  name: "Alex Matcha",
  email: "cliente@demo.mori",
  password: "matcha-demo-2026",
  phone: "+34 600 123 456",
} as const;

export const demoAddress = {
  id: "61000000-0000-4000-8000-000000000001",
  label: "Casa",
  line1: "C/ del Espíritu Santo 22",
  line2: "3º B",
  postalCode: "28004",
  city: "Madrid",
  instructions: "Timbre de la izquierda",
} as const;

export const demoFavouriteSlugs = ["classic-matcha", "vanilla-matcha"] as const;
