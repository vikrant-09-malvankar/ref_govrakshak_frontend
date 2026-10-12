import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import i18n from './i18n' // Import i18n instance
import { I18nextProvider } from 'react-i18next'
import ErrorBoundary from './components/ErrorBoundary'

const root = ReactDOM.createRoot(document.getElementById('root')!)

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </I18nextProvider>
    </React.StrictMode>,
  )
}

// Wait for i18n to be initialized before rendering
if (i18n.isInitialized) {
  renderApp()
} else {
  i18n.on('initialized', renderApp)
}
