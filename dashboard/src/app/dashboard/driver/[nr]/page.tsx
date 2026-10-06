import DriverPage from "./DriverPage";

type Props = { params: Promise<{ nr: string }> };

// F1 car numbers are 1-99; listing them lets the static Cloudflare build prerender every driver page.
export function generateStaticParams() {
	return Array.from({ length: 99 }, (_, i) => ({ nr: String(i + 1) }));
}

export default function Page({ params }: Props) {
	return <DriverPage params={params} />;
}
