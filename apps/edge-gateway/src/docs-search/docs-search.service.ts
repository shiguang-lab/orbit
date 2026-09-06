import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Injectable } from "@nestjs/common";

type SearchRecord = { id: string; type: "page"; content: string; breadcrumbs: string[]; url: string };
const docsRoot = path.resolve(fileURLToPath(new URL("../../../../../packages/core-domain/docs", import.meta.url)));
let indexPromise: Promise<SearchRecord[]> | undefined;

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(absolute);
  }
  return files;
}

function parseFrontmatter(markdown: string): { title: string; description: string } {
  const frontmatter = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)?.[1] ?? "";
  const title = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim();
  const description = frontmatter.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim();
  const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return { title: title || heading || "Documentation", description: description || "" };
}

async function buildIndex(): Promise<SearchRecord[]> {
  const files = await walk(docsRoot);
  return Promise.all(files.map(async (file) => {
    const markdown = await readFile(file, "utf8");
    const relative = path.relative(docsRoot, file).split(path.sep).join("/").replace(/\.md$/, "");
    const { title, description } = parseFrontmatter(markdown);
    return { id: `/docs/${relative}`, type: "page", content: `${title}\n${description}\n${markdown}`, breadcrumbs: relative.split("/").slice(0, -1).map((part) => part.replace(/[-_]/g, " ")), url: `/docs/${relative}` };
  }));
}

@Injectable()
export class DocsSearchService {
  async search(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim().toLowerCase() ?? "";
    if (!query) return Response.json([]);
    const limitRaw = Number(url.searchParams.get("limit"));
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const locale = url.searchParams.get("locale");
    const terms = query.split(/\s+/).filter(Boolean);
    indexPromise ??= buildIndex().catch((error) => { indexPromise = undefined; throw error; });
    const records = await indexPromise;
    const results = records.filter((record) => !locale || record.url.includes(`/${locale}/`)).map((record) => {
      const haystack = record.content.toLowerCase();
      const title = record.content.split("\n", 1)[0].toLowerCase();
      const score = terms.reduce((total, term) => total + (title.includes(term) ? 10 : 0) + (haystack.includes(term) ? 1 : 0), 0);
      return { record, score };
    }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score || left.record.url.localeCompare(right.record.url)).slice(0, limit).map((item) => item.record);
    return Response.json(results);
  }
}
