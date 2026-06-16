import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// The match-product edge function imports Deno-only URLs. The pure functions we test
// never call them, so we alias both URLs to a no-op stub to make the file importable
// under Node. See supabase/functions/match-product/__tests__/deno-stubs.ts.
const denoStub = fileURLToPath(
  new URL('./supabase/functions/match-product/__tests__/deno-stubs.ts', import.meta.url),
)

export default defineConfig({
  resolve: {
    alias: [
      { find: 'https://deno.land/std@0.168.0/http/server.ts', replacement: denoStub },
      { find: 'https://esm.sh/@supabase/supabase-js@2', replacement: denoStub },
    ],
  },
  test: {
    environment: 'node',
    include: [
      'lib/__tests__/**/*.test.ts',
      'supabase/functions/**/__tests__/**/*.test.ts',
    ],
  },
})
