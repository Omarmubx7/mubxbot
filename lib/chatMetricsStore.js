/**
 * Shared in-memory chat metrics state.
 * Both /api/chat and /api/admin/overview import from this module so the same
 * object is mutated and read within a single server process instance.
 */
export const chatMetricsStore = {
  totalRequests: 0,
  smartResponses: 0,
  disambiguationsIssued: 0,
  disambiguationsResolved: 0,
  disambiguationsExpired: 0,
  noResults: 0,
  helpResponses: 0,
  errors: 0
};

/** Map<token, { context, createdAt }> — shared pending disambiguation sessions. */
export const pendingDisambiguationsStore = new Map();
