# Realtime publisher

Shared HTTP transport for dashboard events emitted by edge-gateway, control-api
and worker. Each application starts it with its local event subscription and
internal-service authentication headers, then closes it during Nest shutdown.
Importing the package starts no work and it does not depend on the domain bus.

Delivery is best effort: HTTP errors are reported to the application's callback,
requests time out after 1.5 seconds, and at most 128 deliveries may be pending.
Additional events are dropped while that limit is reached. Closing unsubscribes,
aborts pending requests and waits for them to settle. No retries or persistence
are provided; request processing never waits for dashboard delivery.
