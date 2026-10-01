import type { Listing } from './types';
/** Published snapshots also recognize approvals made before approvedAt was introduced. */
export const isApproved = (listing?: Pick<Listing, 'published' | 'approvedAt'>) =>
  Boolean(listing?.approvedAt || listing?.published);
export const needsPayment = (listing?: Pick<Listing, 'published' | 'approvedAt' | 'payment'>) =>
  !isApproved(listing) && !listing?.payment?.claimedAt;
