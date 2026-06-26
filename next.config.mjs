/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Самодостаточный сервер для компактного Docker-образа (и k8s).
  output: "standalone",
};

export default nextConfig;
