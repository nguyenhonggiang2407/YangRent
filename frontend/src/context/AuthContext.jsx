import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)
const TOKEN_KEY = 'yangrent_token'
const LEGACY_TOKEN_KEY = 'troflow_token'

function readToken() {
  const current = localStorage.getItem(TOKEN_KEY)
  if (current) return current
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY)
  if (legacy) localStorage.setItem(TOKEN_KEY, legacy)
  return legacy
}

function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = readToken()
    if (!token) {
      setLoading(false)
      return
    }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        clearToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    storeToken(res.data.access_token)
    setUser(res.data.user)
    return res.data.user
  }

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload)
    storeToken(res.data.access_token)
    setUser(res.data.user)
    return res.data.user
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  const refresh = async () => {
    const res = await api.get('/auth/me')
    setUser(res.data)
    return res.data
  }

  const hasRole = (...roles) => user && roles.some((r) => (user.roles || []).includes(r))

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
