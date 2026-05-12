import type { JWKSService } from "@/domain/ports/jwks-service";
import type { StoreService } from "@/domain/ports/store-service";
import { createSaleorStoreService } from "@/infrastructure/store-service/saleor/saleor-store-service";

export const createStoreService = (jwksService: JWKSService): StoreService =>
  createSaleorStoreService(jwksService);
