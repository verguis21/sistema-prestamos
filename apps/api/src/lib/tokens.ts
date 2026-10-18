import { SignJWT, jwtVerify } from "jose";

const ISSUER = "sistema-prestamos-api";
const AUDIENCE = "sistema-prestamos-web";
const EXPIRATION = "2h";

function secretBytes(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_SECRET debe tener al menos 32 bytes y estar en .env");
  }
  return new TextEncoder().encode(secret);
}

export function validateTokenConfig(): void {
  secretBytes();
}

export async function createAccessToken(trabajadorId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(trabajadorId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(EXPIRATION)
    .sign(secretBytes());
}

export async function readAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, secretBytes(), {
    algorithms: ["HS256"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Token sin identificador de trabajador");
  }
  return payload.sub;
}
