import { catalogRepositoryContract } from "@/test/catalog-contract";
import { catalogSeed } from "../seed/catalog";
import { MemoryCatalogRepository } from "./memory-catalog-repository";

catalogRepositoryContract("MemoryCatalogRepository", () => new MemoryCatalogRepository(catalogSeed));
