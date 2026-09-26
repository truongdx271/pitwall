import { NextRequest, NextResponse } from "next/server";

import { env } from "@/env";

export const dynamic = "force-dynamic";

const PASSTHROUGH_HEADERS = ["Content-Type", "Cache-Control", "Retry-After"];

export async function GET(req: NextRequest) {
	const path = req.nextUrl.searchParams.get("path");
	if (!path) return new NextResponse(null, { status: 400 });

	try {
		const upstream = await fetch(`${env.API_URL}/api/radio/transcript?path=${encodeURIComponent(path)}`, {
			cache: "no-store",
		});

		const headers = new Headers();
		for (const name of PASSTHROUGH_HEADERS) {
			const value = upstream.headers.get(name);
			if (value) headers.set(name, value);
		}

		return new NextResponse(upstream.body, { status: upstream.status, headers });
	} catch {
		return new NextResponse(null, { status: 502 });
	}
}
