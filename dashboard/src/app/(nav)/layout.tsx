import { type ReactNode } from "react";

import Footer from "@/components/Footer";
import SiteHeader from "@/components/shell/SiteHeader";

type Props = {
	children: ReactNode;
};

export default function Layout({ children }: Props) {
	return (
		<>
			<SiteHeader />
			<main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6">{children}</main>
			<Footer />
		</>
	);
}
