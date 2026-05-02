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

/**
 * Remove all properties with undefined values from an object.
 * RTDB throws error if a payload contains undefined.
 */
export function stripUndefined<T>(value: T): T {
  if (value === undefined) return undefined as any;
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;
  
  if (Array.isArray(value)) {
    return value.map(stripUndefined) as any;
  }

  const result: any = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    result[k] = stripUndefined(v);
  }
  return result;
}

/** Legacy alias for stripUndefined used in some branches. */
export const omitUndefinedDeep = stripUndefined;
