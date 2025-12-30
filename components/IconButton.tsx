import type { ButtonHTMLAttributes, ReactNode } from "react"

import { Tooltip } from "~/components/Tooltip"

type IconButtonVariant = "primary" | "secondary" | "danger"

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  label: string
  children: ReactNode
  variant?: IconButtonVariant
}

const variantClassName: Record<IconButtonVariant, string> = {
  primary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
  secondary:
    "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  danger: "bg-rose-600 text-white hover:bg-rose-500"
}

export const IconButton = ({
  label,
  variant = "secondary",
  className,
  type,
  children,
  ...buttonProps
}: IconButtonProps) => {
  return (
    <Tooltip label={label}>
      <button
        aria-label={label}
        className={[
          "flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-50",
          variantClassName[variant],
          className
        ]
          .filter(Boolean)
          .join(" ")}
        type={type ?? "button"}
        {...buttonProps}>
        {children}
      </button>
    </Tooltip>
  )
}
