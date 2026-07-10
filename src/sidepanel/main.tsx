import { createRoot } from 'react-dom/client'
import '../styles/fonts.css'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/ui.css'
import './panel.css'
import { PORT_PANEL } from '../lib/messages'
import { initTheme } from '../lib/theme'
import App from './App'

initTheme()

function connectPanelPort(): void {
  try {
    const port = chrome.runtime.connect({ name: PORT_PANEL })
    void chrome.windows.getCurrent().then((win) => {
      if (win.id !== undefined) port.postMessage({ kind: 'hello', windowId: win.id })
    })
    port.onMessage.addListener((msg: { kind?: string }) => {
      if (msg.kind === 'close') window.close()
    })
  } catch {
    return
  }
}

connectPanelPort()

const el = document.getElementById('root')
if (el) createRoot(el).render(<App />)
