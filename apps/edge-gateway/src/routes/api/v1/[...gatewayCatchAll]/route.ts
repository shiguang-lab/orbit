import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";

function notFoundResponse(request: Request): Response {
  const url = new URL(request.url);
  return Response.json(
    {
      error: {
        message: `Unknown API route: ${url.pathname}`,
        type: "not_found",
        code: "unknown_route",
        path: url.pathname,
      },
    },
    {
      status: 404,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    },
  );
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  return notFoundResponse(request);
}
export async function POST(request: Request) {
  return notFoundResponse(request);
}
export async function PUT(request: Request) {
  return notFoundResponse(request);
}
export async function PATCH(request: Request) {
  return notFoundResponse(request);
}
export async function DELETE(request: Request) {
  return notFoundResponse(request);
}
export async function HEAD(request: Request) {
  return notFoundResponse(request);
}
