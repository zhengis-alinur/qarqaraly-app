/** Canonical +7 value for a complete or partially entered national number. */
export function phoneInputValue(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const hasCountryCode = /^\s*\+7/.test(raw) || (digits.length === 11 && /^[78]/.test(digits));
  const national = (hasCountryCode ? digits.slice(1) : digits).slice(0, 10);
  return national ? `+7${national}` : '';
}

export function formatPhoneInput(raw: string): string {
  const national = phoneInputValue(raw).slice(2);
  return '+7' + [national.slice(0, 3), national.slice(3, 6), national.slice(6, 8), national.slice(8, 10)]
    .filter(Boolean).join('-');
}

/** Count editable digits, excluding the fixed country prefix. */
export function phoneDigitOffset(display: string, caret: number): number {
  return display.slice(2, Math.max(2, caret)).replace(/\D/g, '').length;
}

export function phoneCaretPosition(display: string, digitOffset: number): number {
  if (digitOffset <= 0) return 2;
  let digits = 0;
  for (let index = 2; index < display.length; index++) {
    if (/\d/.test(display[index]) && ++digits === digitOffset) return index + 1;
  }
  return display.length;
}

/** Backspace/Delete remove a digit even when the caret touches a separator. */
export function deletePhoneDigit(display: string, caret: number, backwards: boolean) {
  const national = phoneInputValue(display).slice(2);
  const offset = phoneDigitOffset(display, caret);
  const removeAt = backwards ? offset - 1 : offset;
  if (removeAt < 0 || removeAt >= national.length) return { value: phoneInputValue(display), offset };
  return { value: phoneInputValue(`+7${national.slice(0, removeAt)}${national.slice(removeAt + 1)}`), offset: removeAt };
}
