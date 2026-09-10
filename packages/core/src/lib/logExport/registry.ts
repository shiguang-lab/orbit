import { bigQueryDestination } from "./destinations/bigquery";
import type { LogExportDestinationType } from "./types";

const destinations: ReadonlyArray<LogExportDestinationType> = [bigQueryDestination as LogExportDestinationType];
const testDestinations = new Map<string, LogExportDestinationType>();
export function listLogExportDestinationTypes() { return [...destinations, ...testDestinations.values()]; }
export function getLogExportDestinationType(id: string) { return destinations.find((item) => item.id === id) ?? testDestinations.get(id); }
export function isKnownLogExportDestinationType(id: string) { return Boolean(getLogExportDestinationType(id)); }
export function __registerLogExportDestinationTypeForTest(destination: LogExportDestinationType) { testDestinations.set(destination.id,destination); }
export function __resetLogExportDestinationTypesForTest() { testDestinations.clear(); }
export function describeLogExportDestinationTypes() {
  return listLogExportDestinationTypes().map(({ id, label, description, docsUrl, fields }) => ({ id, label, description, docsUrl: docsUrl ?? null, fields }));
}
