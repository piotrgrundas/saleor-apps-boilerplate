import type { JWKSRepository, JWKSRepositoryOptions } from "@/domain/ports/jwks-repository";
import { createJwksRepositoryFactory } from "@/infrastructure/jose/jwks/memory/jwks-memory-repository-factory";

export const createJwks = (opts?: JWKSRepositoryOptions): JWKSRepository =>
  createJwksRepositoryFactory(opts);
