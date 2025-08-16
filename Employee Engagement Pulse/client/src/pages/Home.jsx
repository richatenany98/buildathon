import api from '../api'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Home() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/auth/me')
        setFirstName(data?.firstName || '')
        // Redirect to dashboard
        navigate('/dashboard')
      } catch {
        // If unauthorized, go back to login
        navigate('/')
      }
    }
    load()
  }, [navigate])
  
  const onLogout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch { /* empty */ }
    navigate('/')
  }
  
  return (
    <div className="container">
      <div className="topbar">
        <button className="btn" onClick={onLogout}>Sign out</button>
      </div>
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>Welcome{firstName ? ` ${firstName}` : ''}!</h1>
        <p>Redirecting to dashboard...</p>
      </div>
    </div>
  )
}


