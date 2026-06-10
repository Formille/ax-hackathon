/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint is run separately; never let it block a deploy build.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Screenshot uploads are sent to a server action as form data.
    serverActions: { bodySizeLimit: "8mb" },
  },
  images: {
    // Participant thumbnails can be hosted anywhere (admin-provided URLs).
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
