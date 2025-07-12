import React from 'react'
import ReactDOM from 'react-dom/client'
import AMCLandingPage from './pages/Landing'
import './index.css'
import TestComponent from '../TestComponent'


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AMCLandingPage />
  </React.StrictMode>,
)