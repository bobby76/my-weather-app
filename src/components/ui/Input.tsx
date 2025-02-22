import React, { InputHTMLAttributes } from 'react';

export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={`px-3 py-2 border rounded-md ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';