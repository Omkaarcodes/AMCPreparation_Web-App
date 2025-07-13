import React from 'react'
import ReactDOM from 'react-dom/client'
import AMCLandingPage from '../client/src/pages/Landing'
import './globals.css'
import LoginForm from '../client/src/components/login-form'


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LoginForm />
  </React.StrictMode>,
)