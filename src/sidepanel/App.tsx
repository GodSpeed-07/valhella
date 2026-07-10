import { useEffect } from 'react'
import Header from './components/Header'
import Thread from './components/Thread'
import Composer from './components/Composer'
import NoKey from './components/NoKey'
import History from './views/History'
import SettingsView from './views/SettingsView'
import { stopAgent, useAgent } from './agent'
import { useStore } from './store'

export default function App() {
  const ready = useStore((s) => s.ready)
  const settings = useStore((s) => s.settings)
  const view = useStore((s) => s.view)
  const keyInvalid = useStore((s) => s.keyInvalid)

  useEffect(() => {
    void useStore.getState().init()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (useAgent.getState().running) stopAgent()
      else if (useStore.getState().streaming) useStore.getState().stop()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (!ready || !settings) return <div className="app" />

  const noKey = !settings.apiKey || keyInvalid

  return (
    <div className="app">
      <Header />
      {view === 'history' ? (
        <History />
      ) : view === 'settings' ? (
        <SettingsView />
      ) : noKey ? (
        <NoKey />
      ) : (
        <>
          <Thread />
          <Composer />
        </>
      )}
    </div>
  )
}
