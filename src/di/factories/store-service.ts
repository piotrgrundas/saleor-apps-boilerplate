import type { JWKSService } from "@/application/domain/services/jwks-service";
import type { StoreService } from "@/application/domain/services/store-service";
import { SaleorStoreService } from "@/application/infrastructure/saleor/saleor-store-service";

export const createStoreService = (jwksService: JWKSService): StoreService =>
  new SaleorStoreService(jwksService);
