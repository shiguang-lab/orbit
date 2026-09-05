import { Injectable } from "@nestjs/common";
import { GET as getFiles, POST as createFile } from "@shiguang-gateway/core-domain/edge/files-root-handler";
import { GET as getFile, DELETE as deleteFile } from "@shiguang-gateway/core-domain/edge/files-by-id-handler";
import { GET as getFileContent } from "@shiguang-gateway/core-domain/edge/files-content-handler";

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
