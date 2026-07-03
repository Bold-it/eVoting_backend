import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, body, user } = req;

    return next.handle().pipe(
      tap(() => {
        // Only log mutating requests in the admin panel
        if (originalUrl.startsWith('/admin') && ['POST', 'PATCH', 'DELETE'].includes(method)) {
          let action = 'UNKNOWN';
          if (method === 'POST') action = 'CREATE';
          if (method === 'PATCH') action = 'UPDATE';
          if (method === 'DELETE') action = 'DELETE';

          // Try to extract entity type from URL (e.g. /admin/elections -> ELECTION)
          const urlParts = originalUrl.split('?')[0].split('/');
          const entityPart = urlParts[2] || 'SYSTEM';
          let entityType = entityPart.toUpperCase();

          const actorId = user?.email || user?.id || 'SYSTEM';

          // Avoid logging sensitive body data like private keys or passwords
          const safeBody = { ...body };
          delete safeBody.privateKey;
          delete safeBody.password;
          delete safeBody.token;
          delete safeBody.googleToken;

          this.auditService.logAction(
            actorId,
            action,
            entityType,
            undefined, // entityId could be parsed, but let's keep it simple
            { body: safeBody, url: originalUrl }
          ).catch(err => console.error('Failed to save audit log', err));
        }
      }),
    );
  }
}
