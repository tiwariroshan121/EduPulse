import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { App } from './app/App'
import { AppProvider } from './app/AppProvider'
import './theme/global.css'
import './theme/appearance.css'

const isFileOrElectron =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'file:' || /Electron/i.test(navigator.userAgent))

const Router = isFileOrElectron ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AppProvider>
        <App />
      </AppProvider>
    </Router>
  </StrictMode>,
)
