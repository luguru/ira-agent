export class AuditCancelledError extends Error {
  constructor(message = 'Auditoría cancelada por el usuario.') {
    super(message);
    this.name = 'AuditCancelledError';
  }
}

export function throwIfCancelled(isCancelled?: () => boolean): void {
  if (isCancelled?.()) {
    throw new AuditCancelledError();
  }
}
