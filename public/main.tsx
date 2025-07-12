import React from 'react'
import ReactDOM from 'react-dom/client'
import AMCLandingPage from '../client/src/pages/Landing'
import './globals.css'
import TestComponent from '../TestComponent'


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TestComponent />
  </React.StrictMode>,
)