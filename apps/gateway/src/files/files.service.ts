import { Injectable } from "@nestjs/common";
import { GET as getFiles, POST as createFile } from "./handlers/root.handler.js";
import { GET as getFile, DELETE as deleteFile } from "./handlers/by-id.handler.js";
import { GET as getFileContent } from "./handlers/content.handler.js";

@Injectable()
export class FilesService {
  handleGetFiles(req: Request) {
    return getFiles(req);
  }

  handleCreateFile(req: Request) {
    return createFile(req);
  }

  handleGetFile(req: Request, id: string) {
    return getFile(req, { params: { id } as any });
  }

  handleDeleteFile(req: Request, id: string) {
    return deleteFile(req, { params: { id } as any });
  }

  handleGetFileContent(req: Request, id: string) {
    return getFileContent(req, { params: { id } as any });
  }
}
