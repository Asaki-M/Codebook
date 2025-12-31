import Prism from "prismjs"
import { useMemo } from "react"

import "prismjs/components/prism-bash"
import "prismjs/components/prism-clike"
import "prismjs/components/prism-css"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-json"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-markdown"
import "prismjs/components/prism-markup"
import "prismjs/components/prism-python"
import "prismjs/components/prism-sql"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-yaml"

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const normalizePrismLanguage = (raw: string) => {
  const value = raw.trim().toLowerCase().replace(/^language-/, "")
  if (!value || value === "text" || value === "txt" || value === "plaintext") {
    return null
  }

  if (value === "js" || value === "javascript" || value === "node") {
    return "javascript"
  }
  if (value === "ts" || value === "typescript") return "typescript"
  if (value === "jsx") return "jsx"
  if (value === "tsx") return "tsx"
  if (value === "json") return "json"
  if (
    value === "bash" ||
    value === "sh" ||
    value === "shell" ||
    value === "zsh"
  ) {
    return "bash"
  }
  if (value === "py" || value === "python") return "python"
  if (value === "sql") return "sql"
  if (value === "yml" || value === "yaml") return "yaml"
  if (value === "md" || value === "markdown") return "markdown"
  if (value === "html" || value === "xml" || value === "svg") return "markup"
  if (value === "css") return "css"

  return value
}

type HighlightedCodeProps = {
  code: string
  language: string
  preClassName?: string
  codeClassName?: string
}

export const HighlightedCode = ({
  code,
  language,
  preClassName = "",
  codeClassName = ""
}: HighlightedCodeProps) => {
  const prismLanguage = useMemo(
    () => normalizePrismLanguage(language),
    [language]
  )

  const highlighted = useMemo(() => {
    if (!prismLanguage) return escapeHtml(code)

    const grammar = Prism.languages[prismLanguage]
    if (!grammar) return escapeHtml(code)

    return Prism.highlight(code, grammar, prismLanguage)
  }, [code, prismLanguage])

  return (
    <pre className={["codebook-prism", preClassName].join(" ").trim()}>
      <code
        className={[
          `language-${prismLanguage ?? "text"}`,
          "font-mono whitespace-pre-wrap break-words",
          codeClassName
        ]
          .join(" ")
          .trim()}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </pre>
  )
}
