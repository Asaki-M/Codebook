import type { ReactNode } from "react"

type TooltipProps = {
  label: string
  children: ReactNode
}

export const Tooltip = ({ label, children }: TooltipProps) => {
  return (
    <div className="group relative inline-flex">
      {children}
      <div className="pointer-events-none absolute left-1/2 top-[60%] z-50 -translate-x-1/2 -translate-y-full opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <div className="whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg">
          {label}
        </div>
      </div>
    </div>
  )
}
