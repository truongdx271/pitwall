import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
	const { path } = await params;
	const tileUrl = `https://tilecache.rainviewer.com/${path.join("/")}`;

	try {
		const upstream = await fetch(tileUrl, {
			headers: { "User-Agent": "f1-dash/4.0" },
			next: { revalidate: 60 },
		});

		if (!upstream.ok) {
			return new NextResponse(null, { status: upstream.status });
		}

		const body = await upstream.arrayBuffer();

		return new NextResponse(body, {
			status: 200,
			headers: {
				"Content-Type": upstream.headers.get("Content-Type") ?? "image/webp",
				"Cache-Control": "public, max-age=60",
			},
		});
	} catch {
		return new NextResponse(null, { status: 502 });
	}
}
