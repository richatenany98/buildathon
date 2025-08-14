import { Routes, Route } from 'react-router-dom'
import './App.css'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Home from './pages/Home.jsx'

function App() {
  return (
    <div style={{ padding: 16 }}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </div>
  )
}

export default App
