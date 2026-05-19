// src/main.jsx
import "./utils/fetch-auth-shim";   // <-- add this line first
import "./mobileUI.css";
import React from 'react'
import AutoLogoutWrapper from "./components/AutoLogoutWrapper";
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import axios from 'axios'
import { API_BASE } from './api'

// ✅ Create the QueryClient (used by react-query)
const qc = new QueryClient()

// ---------- Axios: Global Auth Interceptor ----------
function attachAxiosAuthInterceptor() {
  try {
    axios.interceptors.request.use(
      (config) => {
        try {
          const url = String(config.url || '')
          const apiOrigin = (API_BASE || '/api').replace(/\/api\/?$/i, '').replace(/\/+$/, '')

          if (url && !/^https?:\/\//i.test(url)) {
            if (url.startsWith('/api/')) {
              config.url = `${apiOrigin}${url}`
            } else if (url.startsWith('/')) {
              config.url = `${API_BASE}${url}`
            }
          }
        } catch (e) {
          console.warn('Axios URL interceptor failed', e)
        }

        try {
          // ✅ Primary key: authToken
          let token = localStorage.getItem('authToken')

          // ✅ Fallback: legacy keys
          if (!token)
            token =
              localStorage.getItem('token') ||
              localStorage.getItem('mahima_token')

          // ✅ Attach Bearer token correctly
          if (token) {
            token = token.trim()
            config.headers = config.headers || {}
            config.headers.Authorization = token.startsWith('Bearer ')
              ? token
              : `Bearer ${token}`
          }
        } catch (e) {
          console.warn(
            'Axios auth interceptor: failed to read token',
            e
          )
        }

        return config
      },
      (err) => Promise.reject(err)
    )
  } catch (e) {
    console.warn('Failed to attach axios interceptor', e)
  }
}

// ✅ Attach interceptor once at startup
attachAxiosAuthInterceptor()

// ✅ Optional helper for refreshing interceptor after login
export function refreshAxiosAuth() {
  attachAxiosAuthInterceptor()
}
// -------------------------------------------------------------------------

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <QueryClientProvider client={qc}>
        <AutoLogoutWrapper>   {/* 🔥 ADD HERE */}
          <App />
        </AutoLogoutWrapper>
      </QueryClientProvider>
    </HashRouter>
  </React.StrictMode>
)
