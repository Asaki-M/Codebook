import type { ReactNode } from "react"

type ModalProps = {
  title: string
  subtitle?: string
  maxWidthClassName?: string
  onClose: () => void
  children: ReactNode
}

export const Modal = ({
  title,
  subtitle,
  maxWidthClassName = "max-w-[720px]",
  onClose,
  children
}: ModalProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
      <div
        className={[
          "w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl",
          maxWidthClassName
        ].join(" ")}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{title}</div>
            {subtitle ? (
              <div className="mt-0.5 truncate text-xs text-slate-500">
                {subtitle}
              </div>
            ) : null}
          </div>
          <button
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            type="button">
            Esc
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
