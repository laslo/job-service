import { createSecretKey } from "node:crypto";

import { jwtVerify } from "jose";

import { ApiErrorCode } from "../common/api-error.js";

export interface JwtPrincipal {
  readonly principalId: string;
}

export class JwtAuthError extends Error {
  readonly statusCode = 401 as const;
  readonly error = ApiErrorCode.Unauthorized as const;

  constructor(message: string) {
    super(message);
    this.name = "JwtAuthError";
  }
}

export async function verifyJwtHS256(opts: {
  readonly token: string;
  readonly secret: string;
}): Promise<JwtPrincipal> {
  const secretKey = createSecretKey(Buffer.from(opts.secret, "utf8"));
  const { payload } = await jwtVerify(opts.token, secretKey, {
    algorithms: ["HS256"],
  });

  const sub = payload.sub;
  if (typeof sub !== "string" || sub.trim().length === 0) {
    throw new JwtAuthError("JWT payload missing subject (sub)");
  }
  return { principalId: sub };
}
