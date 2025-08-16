import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

export default function Signup() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/api/auth/signup', { firstName, lastName, username, email, password })
      navigate('/home')
    } catch (err) {
      setError(err?.response?.data?.message || 'Signup failed')
    }
  }

  return (
    <div className="container">
      <div className="auth-card">
        <h2>Create your account</h2>
        <p className="muted">Sign up here.</p>
        <form onSubmit={onSubmit} className="form">
          {error && <div className="error">{error}</div>}
          <div className="form-row">
            <label htmlFor="firstName">First Name</label>
            <input id="firstName" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="form-row">
            <label htmlFor="lastName">Last Name</label>
            <input id="lastName" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div className="form-row">
            <label htmlFor="username">Username</label>
            <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-row">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="form-row">
            <label htmlFor="password">Password</label>
            <input id="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          <button className="btn btn-primary btn-block" type="submit">Create account</button>
          <div className="footer-text muted">
            Already have an account? <Link className="btn-link" to="/">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  )
}


