import { adminCatalogContract } from "@/test/admin-catalog-contract";
import { MemoryAdminCatalogRepository } from "./memory-admin-catalog";

adminCatalogContract("MemoryAdminCatalogRepository", async () => ({
  catalog: new MemoryAdminCatalogRepository(undefined, [
    {
      id: "grp-size",
      code: "size",
      name: { es: "Tamaño", en: "Size" },
      required: true,
      options: [{ id: "opt-regular", code: "regular", name: { es: "Normal", en: "Regular" }, priceDeltaCents: 0, isAvailable: true }],
    },
  ]),
  categoryId: "cat-signature",
  groupId: "grp-size",
  optionId: "opt-regular",
}));
