// Stubs for the Deno-only URL imports in match-product/index.ts, so the file can be
// imported under Node/Vitest. The PURE functions under test never call these — only the
// serve() handler does, and our `serve` is a no-op so the handler is never executed.
// Mapped in vitest.config.ts via resolve.alias.

export function serve(_handler: unknown): void {
  /* no-op: tests import index.ts only for its pure functions */
}

export function createClient(): unknown {
  return {}
}
