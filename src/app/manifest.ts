import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MŌRI Matcha Bar & Culture",
    short_name: "MŌRI",
    description: "Pide tu matcha, sigue tu pedido en directo y suma sellos en la Tarjeta MŌRI.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3efe7",
    theme_color: "#183d2b",
    categories: ["food", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "La carta", short_name: "Carta", url: "/carta", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mis pedidos", short_name: "Pedidos", url: "/cuenta/pedidos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
