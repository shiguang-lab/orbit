declare module "keytar" {
  export function findCredentials(service: string): Promise<Array<{ account: string; password: string }>>;
  export function getPassword(service: string, account: string): Promise<string | null>;
}
