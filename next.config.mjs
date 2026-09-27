/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
 // allowedDevOrigins: ["192.168.31.179"],
 // allowedDevOrigins: ["192.168.56.1"],
}

export default nextConfig
