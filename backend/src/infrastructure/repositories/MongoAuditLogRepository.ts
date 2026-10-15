import type { AuditLogRepository } from '../../domain/ports/out/AuditLogRepository.js';
import type { AuditLog } from '../../domain/model/AuditLog.js';
import { getAuditDb } from '../database/mongo-connection.js';

/**
 * MongoDB adapter for audit persistence (append-only).
 * Collection: `audit_logs`. Inserts domain objects directly.
 */
export class MongoAuditLogRepository implements AuditLogRepository {
  async save(log: AuditLog): Promise<void> {
    const db = getAuditDb();
    await db
      .collection<{
        _id: string;
        actorId: string;
        action: string;
        timestamp: Date;
        details: Record<string, unknown>;
      }>('audit_logs')
      .insertOne({
      _id: log.id,
      actorId: log.actorId,
      action: log.action,
      timestamp: log.timestamp,
      details: log.details,
    });
  }
}
