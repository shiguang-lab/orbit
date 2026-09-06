export { assertExclusiveConnectionLeaseFence } from "../lib/db/exclusiveConnectionLeases.js";
export {
  LEASE_OWNER_PATTERN,
  acquireExclusiveConnectionLease,
  getActiveExclusiveConnectionLease,
  getExclusiveLeaseOccupancy,
  hashLeaseOwnerId,
  invalidateExclusiveConnectionLease,
  releaseExclusiveConnectionLease,
  renewExclusiveConnectionLease,
  transitionExclusiveConnectionLease,
  type ExclusiveConnectionLease,
  type ExclusiveLeaseEndReason,
} from "../lib/db/exclusiveConnectionLeases.js";
