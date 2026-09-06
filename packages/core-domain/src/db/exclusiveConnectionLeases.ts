export {
  LEASE_OWNER_PATTERN,
  acquireExclusiveConnectionLease,
  assertExclusiveConnectionLeaseFence,
  getActiveExclusiveConnectionLease,
  getExclusiveLeaseOccupancy,
  hashLeaseOwnerId,
  invalidateExclusiveConnectionLease,
  transitionExclusiveConnectionLease,
} from "../lib/db/exclusiveConnectionLeases.js";
export type {
  ExclusiveConnectionLease,
  ExclusiveLeaseEndReason,
} from "../lib/db/exclusiveConnectionLeases.js";
