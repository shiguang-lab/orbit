export function getVncSessionCatalog(): {
  sessions: unknown[];
  providers: Array<{ id: string; name: string; url: string; kind: string }>;
};
