import posthog from "posthog-js";

// Public write-only key — safe to ship in the client bundle.
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "phc_tZJspdgF7AkLT4XahRZvmF3r4tFJJmUSsYxBw3o8u8Kt", {
  api_host: "https://us.i.posthog.com",
  ui_host: "https://us.posthog.com",
  defaults: "2025-05-24",
  capture_exceptions: true,
});
