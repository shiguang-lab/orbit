import { Controller, Get } from "@nestjs/common";

/** Process probes common to every HTTP deployable. */
@Controller()
export class HttpHealthController {
  @Get("livez")
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("healthz")
  health(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("readyz")
  ready(): { status: "ok" } {
    return { status: "ok" };
  }
}
