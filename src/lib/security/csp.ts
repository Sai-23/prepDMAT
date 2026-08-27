function supabaseOrigins(supabaseUrl: string | undefined) {
  if (!supabaseUrl) return [];
  try {
    const url = new URL(supabaseUrl);
    const websocketProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    return [url.origin, `${websocketProtocol}//${url.host}`];
  } catch {
    return [];
  }
}

export function createContentSecurityPolicy(
  nonce: string,
  options: { development?: boolean; supabaseUrl?: string } = {},
) {
  const development = options.development ?? process.env.NODE_ENV === "development";
  const connectSources = ["'self'", ...supabaseOrigins(options.supabaseUrl)];
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    // Three progress indicators use bounded React style attributes for width.
    // Script execution remains nonce-only; inline styles are the minimum
    // compatibility exception for the current UI.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.map((directive) => `${directive};`).join(" ");
}
