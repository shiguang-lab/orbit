import { Injectable } from "@nestjs/common";
import { jwtVerify } from "jose";

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET?.trim();
  return secret ? new TextEncoder().encode(secret) : null;
}

@Injectable()
export class AuthService {
  async verifyAuthToken(token?: string | null): Promise<boolean> {
    const secret = getJwtSecret();
    if (!token || !secret) {
      return false;
    }
    try {
      await jwtVerify(token, secret);
      return true;
    } catch {
      return false;
    }
  }
}
