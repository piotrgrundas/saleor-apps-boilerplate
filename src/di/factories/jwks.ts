import type { JWKSRepository } from "@/domain/ports/jwks-repository";
import type { JWKSService } from "@/domain/ports/jwks-service";
import { createJoseJWKSRepository } from "@/infrastructure/jwks/jose/jose-jwks-repository";
import { createJoseJWKSService } from "@/infrastructure/jwks/jose/jose-jwks-service";

export const createJwksRepository = (): JWKSRepository => createJoseJWKSRepository();

export const createJwksService = (jwksRepository: JWKSRepository): JWKSService =>
  createJoseJWKSService(jwksRepository);
