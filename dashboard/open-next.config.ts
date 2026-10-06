import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Read-only cache in Workers static assets: serves the prerendered pages without rendering them per request.
export default defineCloudflareConfig({ incrementalCache: staticAssetsIncrementalCache });
