/** @type {import('next').NextConfig} */
const webpack = require("webpack");

const nextConfig = {
  reactStrictMode: true,
  output: "export",

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**", pathname: "/**" },
      { protocol: "http", hostname: "**", pathname: "/**" }
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' https: http:;",
              "img-src 'self' https: http: data: blob:;",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http:;",
              "style-src 'self' 'unsafe-inline' https: http:;",
              "font-src 'self' https: http: data:;",
              "connect-src 'self' https: http: wss: ws:;",
              "frame-src 'self' https: http: https://www.google.com https://recaptcha.net;",
              "media-src 'self' https: http:;",
              "object-src 'none';",
              "base-uri 'self';",
              "form-action 'self' https: http:;",
              "frame-ancestors 'self' https: http:;"
            ].join(" ")
          },
          { key: "X-Robots-Tag", value: "index, follow, all" }
        ],
      },
    ];
  }
};

module.exports = nextConfig;