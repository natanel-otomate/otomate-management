export type SafeErrorDetails = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function toSafeErrorDetails(err: unknown): SafeErrorDetails {
  if (err instanceof Error) return { message: err.message };

  if (err && typeof err === 'object') {
    const anyErr = err as any;
    const message =
      typeof anyErr.message === 'string'
        ? anyErr.message
        : typeof anyErr.error === 'string'
          ? anyErr.error
          : 'Unknown error';

    const out: SafeErrorDetails = { message };
    if (typeof anyErr.code === 'string') out.code = anyErr.code;
    if (typeof anyErr.details === 'string') out.details = anyErr.details;
    if (typeof anyErr.hint === 'string') out.hint = anyErr.hint;
    return out;
  }

  return { message: 'Unknown error' };
}

export function isMissingTableError(err: unknown): boolean {
  // Postgres undefined_table is 42P01. PostgREST surfaces it as `code`.
  return !!(err && typeof err === 'object' && (err as any).code === '42P01');
}

