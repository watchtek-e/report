import React, { InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className={`ui-input-wrapper ${className}`}>
        {label && <label className="ui-input-label">{label}</label>}
        <input
          ref={ref}
          className={`ui-input ${error ? 'has-error' : ''}`}
          {...props}
        />
        {error && <span className="ui-input-error">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
