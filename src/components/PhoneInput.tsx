'use client';

import type { InputHTMLAttributes } from 'react';
import { deletePhoneDigit, formatPhoneInput, phoneCaretPosition, phoneDigitOffset, phoneInputValue } from '@/lib/phone-input';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange' | 'maxLength'> & {
  value: string;
  onValueChange: (value: string) => void;
};

export default function PhoneInput({ value, onValueChange, name, required, ...props }: Props) {
  function commit(input: HTMLInputElement, raw: string, offset: number) {
    const canonical = phoneInputValue(raw);
    const display = formatPhoneInput(canonical);
    // Set the formatted text and caret together, including edits that leave the value unchanged.
    input.value = display;
    const caret = phoneCaretPosition(display, offset);
    input.setSelectionRange(caret, caret);
    onValueChange(canonical);
  }

  return <>
    <input {...props} type="tel" inputMode="tel" autoComplete={props.autoComplete ?? 'tel'}
      required={required} value={formatPhoneInput(value)}
      pattern={required ? '\\+7[0-9]{3}-[0-9]{3}-[0-9]{2}-[0-9]{2}' : '(?:\\+7|\\+7[0-9]{3}-[0-9]{3}-[0-9]{2}-[0-9]{2})'}
      onChange={event => {
        const input = event.currentTarget;
        const raw = input.value;
        const inputType = (event.nativeEvent as InputEvent).inputType;
        // Mobile keyboards may send an input event without a Backspace/Delete keydown.
        if ((inputType === 'deleteContentBackward' || inputType === 'deleteContentForward') &&
          raw.length < formatPhoneInput(value).length && phoneInputValue(raw) === phoneInputValue(value)) {
          const edit = deletePhoneDigit(formatPhoneInput(value), input.selectionStart ?? 2, inputType === 'deleteContentBackward');
          commit(input, edit.value, edit.offset);
          return;
        }
        const beforeCaret = raw.slice(0, input.selectionStart ?? raw.length);
        const digits = raw.replace(/\D/g, '');
        const prefixDigits = /^\s*\+7/.test(raw) || (digits.length === 11 && /^[78]/.test(digits)) ? 1 : 0;
        commit(input, raw, Math.max(0, beforeCaret.replace(/\D/g, '').length - prefixDigits));
      }}
      onKeyDown={event => {
        props.onKeyDown?.(event);
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        const input = event.currentTarget;
        if ((event.key === 'Backspace' || event.key === 'Delete') && input.selectionStart === input.selectionEnd) {
          event.preventDefault();
          const edit = deletePhoneDigit(input.value, input.selectionStart ?? 2, event.key === 'Backspace');
          commit(input, edit.value, edit.offset);
        }
      }}
      onPaste={event => {
        props.onPaste?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        const input = event.currentTarget;
        const pasted = phoneInputValue(event.clipboardData.getData('text')).slice(2);
        if (!pasted) return;
        const national = phoneInputValue(input.value).slice(2);
        const start = phoneDigitOffset(input.value, input.selectionStart ?? 2);
        const end = phoneDigitOffset(input.value, input.selectionEnd ?? input.value.length);
        commit(input, `+7${national.slice(0, start)}${pasted}${national.slice(end)}`, start + pasted.length);
      }}
      onSelect={event => {
        props.onSelect?.(event);
        const input = event.currentTarget;
        if (input.selectionStart === input.selectionEnd && (input.selectionStart ?? 0) < 2) input.setSelectionRange(2, 2);
      }} />
    {name && <input type="hidden" name={name} value={phoneInputValue(value)} disabled={props.disabled} />}
  </>;
}
