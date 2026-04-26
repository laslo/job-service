import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export const PrincipalId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<{ principalId?: string }>();
  return req.principalId ?? "";
});
