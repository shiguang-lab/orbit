# Tunnel runtime ownership

Cloudflared, ngrok, and Tailscale expose the edge gateway's public API endpoint, so their
processes and host-level commands are owned by `apps/gateway`.

`apps/control` owns the authenticated operator-facing `/api/tunnels/*` routes, input
validation, and public-safe error projection. It must not import or invoke the tunnel runtime.
Instead it sends a typed `@orbit/contracts/tunnel-command` request to
`POST /api/internal/tunnels/command` on the edge gateway. The edge endpoint rejects requests
without the shared `ORBIT_INTERNAL_SERVICE_TOKEN`; this endpoint is not an operator
API and must never be exposed as a public management surface.

Both services must receive the same internal-service token and control must resolve the edge
runtime through `EDGE_GATEWAY_URL` (or `EDGE_GATEWAY_HOST` plus `EDGE_GATEWAY_PORT`). Tailscale
installation progress remains an SSE stream across the internal hop and is projected unchanged
by the control route.
