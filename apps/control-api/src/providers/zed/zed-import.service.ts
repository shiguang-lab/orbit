import { Injectable } from "@nestjs/common";
import * as discover from "./handlers/discover.handler.js";
import * as importCredentials from "./handlers/import.handler.js";
import * as manualImport from "./handlers/manual-import.handler.js";

/** Zed credential import use cases. HTTP transport stays in ZedImportController. */
@Injectable()
export class ZedImportService {
  discover(request: Request) {
    return discover.POST(request);
  }

  import(request: Request) {
    return importCredentials.POST(request);
  }

  manualImport(request: Request) {
    return manualImport.POST(request);
  }
}
