import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Auth/login'
import Register from './components/Auth/register'
import UserDashboard from './components/User/UserDashboard'
import SupervisorDashboard from './components/SupervisorAdmin/SupervisorDashboard'
import HeadAdminDashboard from './components/HeadAdmin/HeadAdminDashboard'
import { authAPI } from './lib/api'

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setIsAuthenticated(false)
      setUserRole(null)
      return
    }
    authAPI.me()
      .then((resp) => {
        const role = String(resp?.data?.role || '')
        if (role) {
          setIsAuthenticated(true)
          setUserRole(role)
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('role')
          localStorage.removeItem('userId')
          localStorage.removeItem('username')
          setIsAuthenticated(false)
          setUserRole(null)
        }
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
        setIsAuthenticated(false)
        setUserRole(null)
      })
  }, [])

  const handleLogin = (token: string, role: string) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    setIsAuthenticated(true)
    setUserRole(role)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userId')
    localStorage.removeItem('username')
    setIsAuthenticated(false)
    setUserRole(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            !isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to={getDashboardRoute(userRole)} />
            )
          } 
        />
        <Route 
          path="/register" 
          element={
            !isAuthenticated ? (
              <Register onRegister={handleLogin} />
            ) : (
              <Navigate to={getDashboardRoute(userRole)} />
            )
          } 
        />
        <Route
          path="/dashboard/user"
          element={
            isAuthenticated && userRole === 'user' ? (
              <UserDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/dashboard/supervisor"
          element={
            isAuthenticated && userRole === 'supervisor' ? (
              <SupervisorDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/dashboard/head-admin"
          element={
            isAuthenticated && (userRole === 'head_admin' || userRole === 'admin') ? (
              <HeadAdminDashboard onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to={getDashboardRoute(userRole)} />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

function getDashboardRoute(role: string | null): string {
  switch (role) {
    case 'user':
      return '/dashboard/user'
    case 'supervisor':
      return '/dashboard/supervisor'
    case 'head_admin':
    case 'admin':
      return '/dashboard/head-admin'
    default:
      return '/login'
  }
}
