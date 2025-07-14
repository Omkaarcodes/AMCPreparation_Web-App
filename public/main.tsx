import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AMCLandingPage from '../client/src/pages/Landing'
import LoginForm from '../client/src/components/auth/sign_in/login-form'
import SignUpForm from '../client/src/components/auth/create_account/sign-up-form'
import './globals.css'
import AuthRoute from '../client/src/components/auth/AuthRoute'
import { firebaseConfig } from '../client/src/components/auth/firebaseConfig'
import { initializeApp } from 'firebase/app'
import VerificationSuccess from '../client/src/components/auth/YouLoggedIn'

initializeApp(firebaseConfig);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AMCLandingPage />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/sign-up" element={<SignUpForm />} />
        <Route path='*' element={<Navigate to='/'/>} />
        <Route path="/dashboard" element={<AuthRoute><VerificationSuccess /></AuthRoute>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)

