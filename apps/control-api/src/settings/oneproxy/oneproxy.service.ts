import { Injectable } from "@nestjs/common";

export type OneproxyRedirect = {
  status: 308;
  location: "/api/settings/free-proxies" | "/api/settings/free-proxies/sync";
};

/** Encapsulates the stable redirects kept for clients of the retired 1proxy API. */
@Injectable()
export class OneproxyService {
  listRedirect(): OneproxyRedirect {
    return { status: 308, location: "/api/settings/free-proxies" };
  }

  syncRedirect(): OneproxyRedirect {
    return { status: 308, location: "/api/settings/free-proxies/sync" };
  }
}
