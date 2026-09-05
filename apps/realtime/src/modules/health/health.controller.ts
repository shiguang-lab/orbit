import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("livez")
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("healthz")
  health(): { status: "ok" } {
    return { status: "ok" };
  }
}
