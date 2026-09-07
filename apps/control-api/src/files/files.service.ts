import { Injectable } from "@nestjs/common";
import { getFile, getFileContent, listFiles } from "@orbit/core/db/files";

@Injectable()
export class FilesService {
  list(limit: number) {
    return listFiles({ limit });
  }

  content(id: string):
    | { status: 404; body: { error: { message: string; type: string } } }
    | {
        status: 200;
        file: NonNullable<ReturnType<typeof getFile>>;
        content: NonNullable<ReturnType<typeof getFileContent>>;
      } {
    const file = getFile(id);
    if (!file) return { status: 404, body: { error: { message: "File not found", type: "invalid_request_error" } } };
    const content = getFileContent(id);
    if (!content) return { status: 404, body: { error: { message: "File content not found", type: "invalid_request_error" } } };
    return { status: 200, file, content };
  }
}
