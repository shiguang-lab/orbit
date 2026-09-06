import { Injectable } from "@nestjs/common";
import { applyLocal as applyClaude, exportFile as exportClaude } from "../handlers/provider-claude-auth-files.js";
import { applyLocal as applyCodex, exportFile as exportCodex } from "../handlers/provider-codex-auth-files.js";

@Injectable()
export class ProviderCredentialFilesService {
  applyClaude(request: Request, id: string) { return applyClaude(request, id); }
  exportClaude(request: Request, id: string) { return exportClaude(request, id); }
  applyCodex(request: Request, id: string) { return applyCodex(request, id); }
  exportCodex(request: Request, id: string) { return exportCodex(request, id); }
}
