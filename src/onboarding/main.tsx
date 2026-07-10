import { createRoot } from 'react-dom/client'
import '../styles/fonts.css'
import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/ui.css'
import { initTheme } from '../lib/theme'
import Onboarding from './Onboarding'

initTheme()

const el = document.getElementById('root')
if (el) createRoot(el).render(<Onboarding />)
