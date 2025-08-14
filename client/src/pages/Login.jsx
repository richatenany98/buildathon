import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/api/auth/login', { email, password })
      navigate('/home')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="container">
      <div className="auth-card">
        <h2>Welcome</h2>
        <p className="muted">Please log in.</p>
        <form onSubmit={onSubmit} className="form">
          {error && <div className="error">{error}</div>}
          <div className="form-row">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input id="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          <button className="btn btn-primary btn-block" type="submit">Log in</button>
          <div className="footer-text muted">
            Don't have an account? <Link className="btn-link" to="/signup">Sign up</Link>
          </div>
        </form>
      </div>
    </div>
  )
}


