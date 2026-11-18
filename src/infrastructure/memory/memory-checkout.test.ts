import type { UserId } from "@/core/domain/access/actor";
import { orderRepositoryContract } from "@/test/order-contract";
import { MemoryOrderRepository } from "./memory-checkout";

orderRepositoryContract("MemoryOrderRepository", async () => {
  let capacity = 8;
  const orders = new MemoryOrderRepository(8);
  Object.defineProperty(orders, "capacity", { get: () => capacity });
  return {
    orders,
    loyalty: orders,
    customerId: "customer-1" as UserId,
    setCapacity: async (value) => {
      capacity = value;
    },
  };
});
