import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const TOKEN_BYTES = 32;

export function generateOpaqueToken() {
  const token = randomBytes(TOKEN_BYTES).toString("hex");

  return {
    token,
    tokenHash: hashOpaqueToken(token),
  };
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyOpaqueToken(token: string, expectedHash: string) {
  const actualHash = hashOpaqueToken(token);
  const actualBuffer = Buffer.from(actualHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
