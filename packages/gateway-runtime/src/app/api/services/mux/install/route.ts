import { install } from "../../../../../lib/services/installers/mux.ts";
import { handleServiceInstall } from "../../_shared/installRoute.ts";

export async function POST(request: Request): Promise<Response> {
  return handleServiceInstall(request, install);
}
