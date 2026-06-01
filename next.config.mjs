/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint is run separately; never let it block a deploy build.
    ignoreDuringBuilds: true,
  },
  images: {
    // Participant thumbnails can be hosted anywhere (admin-provided URLs).
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
