/**
 * Domain Entity: AuditLog (immutable audit record).
 *
 * DDD purity rules applied:
 *  - No imports of external libraries, frameworks, or infrastructure elements.
 *  - Only TypeScript language built-ins are used.
 *
 *  Type mappings:
 *    UUID     -> string
 *    DateTime -> Date
 */
export class AuditLog {
  private readonly _id: string;
  private readonly _actorId: string;
  private readonly _action: string;
  private readonly _timestamp: Date;
  private readonly _details: Record<string, unknown>;

  constructor(params: {
    id: string;
    actorId: string;
    action: string;
    timestamp: Date;
    details: Record<string, unknown>;
  }) {
    if (!params.id || params.id.trim().length === 0) {
      throw new Error('AuditLog.id is required.');
    }
    if (!params.actorId || params.actorId.trim().length === 0) {
      throw new Error('AuditLog.actorId is required.');
    }
    if (!params.action || params.action.trim().length === 0) {
      throw new Error('AuditLog.action is required.');
    }
    if (!(params.timestamp instanceof Date) || Number.isNaN(params.timestamp.getTime())) {
      throw new Error('AuditLog.timestamp must be a valid Date.');
    }

    this._id = params.id.trim();
    this._actorId = params.actorId.trim();
    this._action = params.action.trim();
    this._timestamp = params.timestamp;
    this._details = params.details;
  }

  get id(): string {
    return this._id;
  }

  get actorId(): string {
    return this._actorId;
  }

  get action(): string {
    return this._action;
  }

  get timestamp(): Date {
    return this._timestamp;
  }

  get details(): Record<string, unknown> {
    return this._details;
  }
}
