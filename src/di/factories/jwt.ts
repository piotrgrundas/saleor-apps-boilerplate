import type { JWTService } from "@/domain/ports/jwt-service";
import { createJoseJWTService } from "@/infrastructure/jwt/jose/jose-jwt-service";

export const createJwtService = (): JWTService => createJoseJWTService();
