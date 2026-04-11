type ActionButtonProps = {
  label: string
  onClick?: () => void
  disabled?: boolean
}

export default function ActionButton({
  label,
  onClick,
  disabled = false,
}: ActionButtonProps) {

  return (

    <button
      className="action-button"
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {label}
    </button>

  )

}