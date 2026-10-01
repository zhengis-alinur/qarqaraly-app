import assert from 'node:assert/strict';
import { test } from 'node:test';
import { needsPayment, isApproved } from '../src/lib/listing-payment';
import { emptyListing } from '../src/lib/types';

test('new and unapproved listings require payment', () => {
 assert.equal(needsPayment(), true);
 assert.equal(needsPayment({published:null}), true);
});
test('existing published listings do not need another payment, including legacy approvals', () => {
 assert.equal(isApproved({published:emptyListing}), true);
 assert.equal(needsPayment({published:emptyListing}), false);
});
test('approval survives archiving and subsequent edits', () => {
 assert.equal(needsPayment({published:null,approvedAt:'2026-10-01T10:00:00Z'}), false);
});
test('a payment claim skips a duplicate payment but is not an approval', () => {
 const listing={published:null,payment:{payerName:'Owner',amount:1000,method:'QR',claimedAt:'2026-10-01T10:00:00Z'}};
 assert.equal(needsPayment(listing), false);
 assert.equal(isApproved(listing), false);
});
