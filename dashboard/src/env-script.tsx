import { connection } from "next/server";
import Script from "next/script";

import { PUBLIC_ENV_KEY } from "@/env";
import { isRuntimeEnv } from "@/lib/runtimeEnv";

// only list env vars that can be exposed to the client

export const getPublicEnv = () => ({
	NEXT_PUBLIC_LIVE_URL: process.env.NEXT_PUBLIC_LIVE_URL,
});

export default async function EnvScript() {
	if (isRuntimeEnv(process.env)) await connection();

	const env = getPublicEnv();

	const innerHTML = {
		__html: `window['${PUBLIC_ENV_KEY}'] = ${JSON.stringify(env)}`,
	};

	return <Script id="public-env" strategy={"beforeInteractive"} dangerouslySetInnerHTML={innerHTML} />;
}
