export type AuthRequestHeaders = Headers | Record<string, string | string[] | undefined>;
/**
 * Safely read a header value from various request-like objects.
 *
 * Accepts:
 * - `Headers` (Web API / Fetch API)
 * - Objects with a `.get()` method (e.g. `IncomingMessage.headers`)
 * - Plain `Record<string, string | string[] | undefined>` objects
 *
 * Extracted to its own module to break the circular import between
 * `./auth.ts` and `./googApiKeyAuth.ts` — both import this function
 * without creating a cycle.
 */
export declare function readHeaderValue(headers: Headers | {
    get?: (name: string) => string | null;
} | Record<string, string | string[] | undefined> | null | undefined, name: string): string | null;
