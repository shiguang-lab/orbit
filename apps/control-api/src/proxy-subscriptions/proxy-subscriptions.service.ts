import { Injectable } from "@nestjs/common";
import * as collection from "./handlers/collection.handler.js";
import * as item from "./handlers/item.handler.js";
import * as nodes from "./handlers/nodes.handler.js";
import * as refresh from "./handlers/refresh.handler.js";

/** Application service exposing proxy-subscription use cases to Nest routes. */
@Injectable()
export class ProxySubscriptionsService {
  list(request: Request) { return collection.GET(request); }
  create(request: Request) { return collection.POST(request); }
  get(request: Request, id: string) { return item.GET(request, { params: Promise.resolve({ id }) }); }
  update(request: Request, id: string) { return item.PATCH(request, { params: Promise.resolve({ id }) }); }
  remove(request: Request, id: string) { return item.DELETE(request, { params: Promise.resolve({ id }) }); }
  nodes(request: Request, id: string) { return nodes.GET(request, { params: Promise.resolve({ id }) }); }
  refresh(request: Request, id: string) { return refresh.POST(request, { params: Promise.resolve({ id }) }); }
}
