/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep heavy server-only packages out of webpack's bundle (Next.js 14 syntax)
  experimental: {
    serverComponentsExternalPackages: [
      "mongoose",
      "mongodb-memory-server",
      "mongodb-memory-server-core",
      "mongodb-connection-string-url",
    ],
  },
  webpack(config, { isServer }) {
    if (isServer) {
      // Prevent webpack from bundling packages that ship non-compliant exports fields
      const existingExternals = config.externals ?? [];
      config.externals = [
        ...existingExternals,
        ({ request }, callback) => {
          const blocked = [
            "mongodb-memory-server",
            "mongodb-memory-server-core",
            "mongodb-connection-string-url",
          ];
          if (blocked.some((pkg) => request === pkg || request.startsWith(pkg + "/"))) {
            return callback(null, "commonjs " + request);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
