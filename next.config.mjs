/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        // Keep @libsql/client external so Next.js doesn't try to webpack-bundle
        // the native binaries. Both the root package and the /http sub-path
        // need to be listed.
        serverComponentsExternalPackages: ['@libsql/client', '@libsql/client/http'],
    },
};

export default nextConfig;
