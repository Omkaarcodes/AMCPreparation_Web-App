import React from 'react'
import axios from 'axios'
import ReactDOM from 'react-dom/client'
import AMCLandingPage from '../client/pages/Landing'
import './index.css'

axios.defaults.baseURL = "http://localhost:3000";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AMCLandingPage />
  </React.StrictMode>,
)