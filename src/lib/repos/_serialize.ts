import type { DataSnapshot } from 'firebase-admin/database';

/**
 * Convert an RTDB snapshot to a plain object with _id.
 */
export function withId<T = Record<string, unknown>>(id: string, data: Record<string, unknown>): T {
  const plain: Record<string, unknown> = { ...data, _id: id };
  return plain as T;
}

/**
 * Iterate an RTDB snapshot into an array of typed records with _id set.
 */
export function snapshotToArray<T>(snap: DataSnapshot): T[] {
  const results: T[] = [];
  snap.forEach((child) => {
    results.push(withId<T>(child.key!, child.val() ?? {}));
  });
  return results;
}

/**
 * Strip _id before writing to RTDB (keys are stored as node keys, not fields).
 */
export function stripId(data: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = data;
  return rest;
}

/** Firebase RTDB rejects `undefined` anywhere in a `.set()` payload. */
export function omitUndefinedDeep(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map(omitUndefinedDeep);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] = omitUndefinedDeep(v);
  }
  return out;
}
