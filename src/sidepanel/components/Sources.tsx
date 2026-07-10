import { useState } from 'react'
import { hostOf, type Source } from '../../lib/citations'

function Favicon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  const host = hostOf(url)
  if (failed) {
    return <span className="src-glyph">{host.charAt(0).toUpperCase()}</span>
  }
  return (
    <img
      className="src-favicon"
      src={`${chrome.runtime.getURL('/_favicon/')}?pageUrl=${encodeURIComponent(url)}&size=32`}
      alt=""
      width={16}
      height={16}
      onError={() => setFailed(true)}
    />
  )
}

export default function Sources({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null
  return (
    <div className="src">
      <div className="src-head">Sources</div>
      <ol className="src-list">
        {sources.map((s, i) => (
          <li key={s.url}>
            <a className="src-item" href={s.url} target="_blank" rel="noreferrer">
              <span className="src-n">{i + 1}</span>
              <Favicon url={s.url} />
              <span className="src-title">{s.title}</span>
              <span className="src-host">{hostOf(s.url)}</span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  )
}
