import type { SVGProps } from "react"

export const IconTrash = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    fill="none"
    height="16"
    viewBox="0 0 24 24"
    width="16"
    {...props}>
    <path
      d="M4 7h16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
    <path
      d="M10 11v6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
    <path
      d="M14 11v6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
    />
    <path
      d="M6 7l1 14a1 1 0 0 0 1 .9h8a1 1 0 0 0 1-.9L18 7"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="2"
    />
    <path
      d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
)
