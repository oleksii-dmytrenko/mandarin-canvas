import type React from "react";

interface IconButtonProps {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function IconButton({ active = false, children, disabled = false, label, onClick }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${active ? "active" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
