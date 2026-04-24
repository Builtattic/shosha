import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export function fromZod(error: ZodError) {
  const first = error.errors[0];
  return fail('validation_error', first?.message ?? 'Invalid request payload', 422);
}
