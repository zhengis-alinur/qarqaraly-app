import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deletePhoneDigit, formatPhoneInput, phoneCaretPosition, phoneDigitOffset, phoneInputValue } from './phone-input';

test('national, international and domestic pasted numbers share one API value', () => {
  for (const value of ['7077777777', '+77077777777', '77077777777', '87077777777', '+7 (707) 777-77-77']) {
    assert.equal(phoneInputValue(value), '+77077777777');
    assert.equal(formatPhoneInput(value), '+7707-777-77-77');
  }
});

test('typing keeps the leading national 7 and inserts separators progressively', () => {
  let value = '';
  const displays = ['+77', '+770', '+7707', '+7707-7', '+7707-77', '+7707-777', '+7707-777-7', '+7707-777-77', '+7707-777-77-7', '+7707-777-77-77'];
  for (const [index, digit] of [...'7077777777'].entries()) {
    value = phoneInputValue(formatPhoneInput(value) + digit);
    assert.equal(formatPhoneInput(value), displays[index]);
  }
  assert.equal(value, '+77077777777');
  assert.equal(phoneInputValue(formatPhoneInput(value) + '99'), value);
});

test('an empty optional field sends an empty value while showing the country prefix', () => {
  for (const value of ['', '+7', 'letters']) {
    assert.equal(phoneInputValue(value), '');
    assert.equal(formatPhoneInput(value), '+7');
  }
});

test('deletion crosses separators, preserves the prefix and keeps the caret near the edit', () => {
  const display = '+7707-123-45-67';
  assert.deepEqual(deletePhoneDigit(display, 6, true), { value: '+7701234567', offset: 2 });
  assert.deepEqual(deletePhoneDigit(display, 5, false), { value: '+7707234567', offset: 3 });
  assert.deepEqual(deletePhoneDigit('+77', 3, true), { value: '', offset: 0 });
  assert.deepEqual(deletePhoneDigit(display, 2, true), { value: '+77071234567', offset: 0 });
  for (let offset = 0; offset <= 10; offset++) {
    assert.equal(phoneDigitOffset(display, phoneCaretPosition(display, offset)), offset);
  }
});
