import { Children, isValidElement, memo, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { highlightCode } from '../../lib/highlight'
import IconButton from '../../ui/IconButton'

function CodeBlock({ code, lang }: { code: string; lang: string | null }) {
  const [copied, setCopied] = useState(false)
  const { html, language } = useMemo(() => highlightCode(code, lang), [code, lang])
  const copy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    })
  }
  return (
    <div className="code">
      <div className="code-head">
        <span className="code-lang">{language ?? 'text'}</span>
        <IconButton
          icon={copied ? 'check' : 'copy'}
          label={copied ? 'Copied' : 'Copy code'}
          size="sm"
          onClick={copy}
        />
      </div>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}

const components = {
  pre({ children }: { children?: ReactNode }) {
    const arr = Children.toArray(children)
    const child = arr[0]
    if (isValidElement(child)) {
      const el = child as ReactElement<{ className?: string; children?: ReactNode }>
      const cls = el.props.className ?? ''
      const lang = /language-([\w+#-]+)/.exec(cls)?.[1] ?? null
      const code = String(el.props.children ?? '').replace(/\n$/, '')
      return <CodeBlock code={code} lang={lang} />
    }
    return <pre>{children}</pre>
  },
  a({ href, children }: { href?: string; children?: ReactNode }) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    )
  },
  table({ children }: { children?: ReactNode }) {
    return (
      <div className="md-tablewrap">
        <table>{children}</table>
      </div>
    )
  }
}

export default memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
})
