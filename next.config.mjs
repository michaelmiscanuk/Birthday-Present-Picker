/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // @libsql/client ships native binaries – keep it external so Next.js
        // doesn't try to bundle it through webpack.
        serverComponentsExternalPackages: ['@libsql/client'],
    },
};

export default nextConfig;
