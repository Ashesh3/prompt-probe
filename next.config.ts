import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
