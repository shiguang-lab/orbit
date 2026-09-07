/** Minimal Web API compatibility used by migrated handlers. */
export type NextRequest = Request;
export class NextResponse extends Response {
  static json(data: unknown, init?: ResponseInit): Response {
    return Response.json(data, init);
  }
}
