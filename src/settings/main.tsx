import { createRoot } from 'react-dom/client'
import '../styles/fonts.css'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/ui.css'
import './settings.css'
import { initTheme } from '../lib/theme'
import Settings from './Settings'

initTheme()

const el = document.getElementById('root')
if (el) createRoot(el).render(<Settings />)
