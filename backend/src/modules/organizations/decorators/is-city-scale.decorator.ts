import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Lee el hecho que TerritorialScaleInterceptor ya resolvió sobre la
// request -- mismo patrón que CurrentUser() leyendo request.user.
export const IsCityScale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest();
    return request.isCityScale ?? true;
  },
);
