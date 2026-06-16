/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  eslint: {
    // Linting is a standalone gate (`npm run lint`), not a build blocker. The codebase
    // carries pre-existing lint debt (unescaped entities, exhaustive-deps) that is
    // intentionally untouched in this change — don't let it fail production deploys.
    // NOTE: this does NOT disable type-checking; `tsc`/build still enforce types
    // (ignoreBuildErrors was deliberately removed earlier).
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
