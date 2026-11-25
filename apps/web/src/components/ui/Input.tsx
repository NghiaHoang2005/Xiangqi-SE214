import { type InputHTMLAttributes, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Hidden while there is an error. */
  helperText?: string;
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

      {/* The live region must exist before the message, or screen readers miss it. */}
      <div className="input-feedback" aria-live="polite" aria-atomic="true">
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
    </div>
  );
}
