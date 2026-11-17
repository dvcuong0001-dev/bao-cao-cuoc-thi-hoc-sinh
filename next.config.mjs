/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ["@aws-sdk/client-s3", "@aws-sdk/s3-request-presigner", "bcryptjs"],
  },
};

export default nextConfig;
