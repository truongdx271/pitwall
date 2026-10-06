import { describe, expect, it } from "vitest";

import { isRuntimeEnv } from "./runtimeEnv";

describe("isRuntimeEnv", () => {
	it("reads env per request by default (Docker)", () => {
		expect(isRuntimeEnv({})).toBe(true);
	});

	it("bakes env at build when STATIC_PUBLIC_ENV=1 (Cloudflare)", () => {
		expect(isRuntimeEnv({ STATIC_PUBLIC_ENV: "1" })).toBe(false);
	});

	it("ignores other values", () => {
		expect(isRuntimeEnv({ STATIC_PUBLIC_ENV: "true" })).toBe(true);
	});
});
