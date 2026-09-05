import {
  elevenLabsOptionsResponse,
  proxyElevenLabsRequest,
} from "../_shared/elevenLabsProxy.ts";

export async function OPTIONS() {
  return elevenLabsOptionsResponse();
}

export async function GET(request: Request) {
  return proxyElevenLabsRequest(request, "/voices");
}
