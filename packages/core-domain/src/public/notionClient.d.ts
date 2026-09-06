export declare function createNotionClient(apiKey: string): {
  searchPagesAndDatabases(query: string, startCursor?: string, pageSize?: number): Promise<unknown>;
};
