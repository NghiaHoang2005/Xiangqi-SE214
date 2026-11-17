/**
 * Input component — US-07, SCRUM-129.
 * Provides a labelled text input with error and helper-text states.
 * Accessibility: aria-invalid, aria-describedby (NFR-16).
 */
import { type InputHTMLAttributes, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Validation error message; sets aria-invalid when present. */
  error?: string;
  /** Supplemental hint shown below the field when no error. */
  helperText?: string;
  /** Marks the field as required with a visual asterisk. */
  required?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  required,
  id: idProp,
  className = '',
  ...rest
}: InputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const descId = `${id}-desc`;
  const hasDesc = !!(error ?? helperText);

  return (
    <div className="input-root">
      <label htmlFor={id} className="input-label">
        {label}
        {required && (
          <span className="input-label-required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      <input
        {...rest}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={hasDesc ? descId : undefined}
        className={`input-field ${className}`.trim()}
      />

      {error ? (
        <span id={descId} className="input-error" role="alert">
          <span aria-hidden="true">⚠</span>
          {error}
        </span>
      ) : helperText ? (
        <span id={descId} className="input-helper">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
