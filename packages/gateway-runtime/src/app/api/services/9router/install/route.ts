import { install } from "../../../../../lib/services/installers/ninerouter.ts";
import { handleServiceInstall } from "../../_shared/installRoute.ts";

export async function POST(request: Request): Promise<Response> {
  return handleServiceInstall(request, install);
}
