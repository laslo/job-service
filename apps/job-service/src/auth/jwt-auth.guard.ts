import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";

import { verifyJwtHS256 } from "./jwt.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private static readonly rate = new Map<
    string,
    {
      windowStartMs: number;
      count: number;
    }
  >();

  canActivate(ctx: ExecutionContext): Promise<boolean> {
    return this.check(ctx);
  }

  private async check(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      principalId?: string;
      method?: string;
      url?: string;
    }>();

    const raw = req.headers.authorization;

    const token = raw?.startsWith("Bearer ") ? raw.slice("Bearer ".length).trim() : "";
    const secret = process.env.JOB_API_JWT_SECRET?.trim() || "";
    if (!token) {
      throw new UnauthorizedException({ message: "Missing Authorization: Bearer <token>" });
    }
    if (!secret) {
      throw new UnauthorizedException({ message: "Missing JOB_API_JWT_SECRET env var" });
    }

    const principal = await verifyJwtHS256({ token, secret });
    req.principalId = principal.principalId;

    // Coarse abuse protection: limit create-job requests per principal.
    if (req.method === "POST" && (req.url ?? "").includes("/jobs")) {
      const key = principal.principalId;
      const now = Date.now();
      const windowMs = 60_000;
      const limit = 20;
      const entry = JwtAuthGuard.rate.get(key);
      if (!entry || now - entry.windowStartMs >= windowMs) {
        JwtAuthGuard.rate.set(key, { windowStartMs: now, count: 1 });
      } else {
        entry.count += 1;
        if (entry.count > limit) {
          throw new HttpException(
            {
              message: "Rate limited: too many create-job requests",
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }

    return true;
  }
}
