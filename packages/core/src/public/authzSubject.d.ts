export interface AuthSubject {
  kind: string;
  id: string;
  label?: string;
  scopes: string[];
}

export function readSubjectFromHeaders(
  headers: Headers | { get(name: string): string | null },
): AuthSubject;
