import assert from 'node:assert/strict';
import { test } from 'node:test';
import { listingDraftSchema, listingSchema } from './validation';
import { emptyListing } from './types';

test('an empty draft and a single character in any text field can be saved', () => {
  assert.deepEqual(listingDraftSchema.parse({}), emptyListing);
  for (const field of ['title', 'description', 'address', 'phone', 'whatsapp', 'website', 'social', 'conditions', 'hours']) {
    const draft = listingDraftSchema.parse({ [field]: 'я' });
    assert.equal(draft[field as keyof typeof draft], 'я');
    assert.equal(listingSchema.safeParse(draft).success, false);
  }
});

test('drafts preserve spaces, partial URLs, incomplete coordinates and unfinished numbers', () => {
  const input = { ...emptyListing, title: ' я ', description: '  начало\n', website: 'https:/', phone: '+7', lat: 49, lng: null, price: -1 };
  assert.deepEqual(listingDraftSchema.parse(input), input);
  assert.equal(listingSchema.safeParse(input).success, false);
});

test('draft saving retains size, type and upload path restrictions', () => {
  for (const invalid of [
    { title: 'a'.repeat(121) }, { description: 'a'.repeat(10001) }, { website: 'a'.repeat(2001) },
    { lat: '49' }, { lat: Infinity }, { photos: [{ url: 'https://example.com/a.jpg', caption: '' }] },
    { photos: Array.from({ length: 11 }, () => ({ url: '/uploads/abc.webp', caption: '' })) },
  ]) assert.equal(listingDraftSchema.safeParse(invalid).success, false);
});

test('publication still requires complete, valid data', () => {
  const complete = { ...emptyListing, title: 'Место', description: 'Описание места для посетителей Каркаралинска.', address: 'Каркаралинск, улица 1' };
  assert.equal(listingSchema.safeParse(complete).success, true);
  for (const change of [{ title: 'я' }, { address: '' }, { description: '' }, { website: 'я' }, { phone: '+' }, { lat: 49, lng: null }]) {
    assert.equal(listingSchema.safeParse({ ...complete, ...change }).success, false);
  }
});
