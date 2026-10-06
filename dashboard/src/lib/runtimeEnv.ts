// Docker injects NEXT_PUBLIC_* at container start, so the page shell must render per request.
// The Cloudflare build fixes them at build time (STATIC_PUBLIC_ENV=1) and can prerender the shell.
export const isRuntimeEnv = (env: Record<string, string | undefined>): boolean => env.STATIC_PUBLIC_ENV !== "1";
