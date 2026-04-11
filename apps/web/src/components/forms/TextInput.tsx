import React from "react";

type TextInputProps = {
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, type = "text", placeholder, error, ...props }, ref) => {

    return (

      <div className="form-field">

        <label className="form-label">
          {label}
        </label>

        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          {...props}
          className={`audit-control ${error ? "input-error" : ""}`}
        />

        {error && (
          <span className="form-error">
            {error}
          </span>
        )}

      </div>

    );

  }
);

TextInput.displayName = "TextInput";

export default TextInput;