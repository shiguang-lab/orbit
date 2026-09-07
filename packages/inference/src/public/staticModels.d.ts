export type LocalCatalogModel = {
  id: string;
  name?: string;
  apiFormat?: string;
  supportedEndpoints?: string[];
};
export function getStaticModelsForProvider(provider: string): LocalCatalogModel[] | undefined;
