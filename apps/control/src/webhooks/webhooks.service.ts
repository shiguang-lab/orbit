import { Injectable } from "@nestjs/common";
import { GET as listWebhooks, POST as createWebhook } from "./handlers/list-create.js";
import { POST as validateWebhookUrl } from "./handlers/validate-url.js";
import { GET as getWebhook, PUT as updateWebhook, DELETE as removeWebhook } from "./handlers/by-id.js";
import { GET as getDeliveries } from "./handlers/deliveries.js";
import { POST as testWebhook } from "./handlers/test.js";

@Injectable()
export class WebhooksService {
  list(request: Request) { return listWebhooks(request); }
  create(request: Request) { return createWebhook(request); }
  validateUrl(request: Request) { return validateWebhookUrl(request); }
  get(request: Request, id: string) { return getWebhook(request, { params: { id } }); }
  update(request: Request, id: string) { return updateWebhook(request, { params: { id } }); }
  remove(request: Request, id: string) { return removeWebhook(request, { params: { id } }); }
  deliveries(request: Request, id: string) { return getDeliveries(request, { params: { id } }); }
  test(request: Request, id: string) { return testWebhook(request, { params: { id } }); }
}
