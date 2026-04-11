import React, { forwardRef } from "react"

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

const TextArea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, ...props }, ref) => {
    return (
      <div className="form-group">
        {label && <label>{label}</label>}

        <textarea
          ref={ref}  
          className="form-textarea"
          {...props}
        />

        {error && <span className="error-text">{error}</span>}
      </div>
    )
  }
)

TextArea.displayName = "TextArea"

export default TextArea