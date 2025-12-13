import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// Axios configuration is handled in src/lib/api.ts
// No need to configure axios defaults here

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="min-h-screen bg-background text-foreground">
      <App />
    </div>
  </React.StrictMode>
)
