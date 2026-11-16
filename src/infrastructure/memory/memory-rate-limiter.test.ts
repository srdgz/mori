import { rateLimiterContract } from "@/test/rate-limiter-contract";
import { MemoryRateLimiter } from "./memory-rate-limiter";

rateLimiterContract("MemoryRateLimiter", (clock) => new MemoryRateLimiter(clock));
