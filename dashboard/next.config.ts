import type { NextConfig } from "next";

import pack from "./package.json" with { type: "json" };

import "@/env";

// NEXT_EXPORT=1 is the static Cloudflare build: plain files, no server. Route handlers are named
// route.server.ts so only server builds pick them up.
const staticExport = process.env.NEXT_EXPORT === "1";
const output = staticExport ? "export" : process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined;
const compress = process.env.NEXT_NO_COMPRESS === "1";

const frameDisableHeaders = [
	{
		source: "/(.*)",
		headers: [
			{
				type: "header",
				key: "X-Frame-Options",
				value: "SAMEORIGIN",
			},
			{
				type: "header",
				key: "Content-Security-Policy",
				value: "frame-ancestors 'self';",
			},
		],
	},
];

const config: NextConfig = {
	output,
	pageExtensions: staticExport ? ["tsx", "ts"] : ["tsx", "ts", "server.ts"],
	compress,
	env: {
		version: pack.version,
	},
	images: {
		// No optimizer without a server; every next/image source is an SVG anyway.
		unoptimized: staticExport,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**formula1.com",
				port: "",
			},
		],
	},
	// The static build ships them as cloudflare/_headers (Workers static assets) instead.
	headers: staticExport ? undefined : async () => frameDisableHeaders,
};

export default config;
