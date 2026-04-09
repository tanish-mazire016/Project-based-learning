import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Activity,
  TrendingUp,
  Users,
  IndianRupeeIcon
} from 'lucide-react'
import axios from 'axios'
import logo from '../assets/logo.png'
import { useAuth } from './AuthContext'

const Login = () => {
  const navigate = useNavigate()
<<<<<<< HEAD:Frontend/src/Components/Login.jsx

=======
  const { login: loginUser } = useAuth()
>>>>>>> 3ebc4100a24bd6b8711dd61ede6bc0005a5e26e6:Fronted/src/Components/Login.jsx
  const [userRole, setUserRole] = useState('Risk Analyst')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await axios.post('http://127.0.0.1:8000/login', {
        email,
        password,
        role: userRole
      })

<<<<<<< HEAD:Frontend/src/Components/Login.jsx
      // ✅ SAVE AUTH STATE
      localStorage.setItem('isAuthenticated', 'true')
      localStorage.setItem('userRole', response.data.role)

      if (rememberMe) {
        localStorage.setItem('userEmail', email)
      }

      alert(response.data.message)

      // ✅ ROLE-BASED REDIRECT
      if (response.data.role === 'Administrator') {
=======
      // Store user data in AuthContext (from backend response)
      loginUser(response.data.user)

      // Navigate based on role
      if (response.data.user.role === 'Administrator') {
>>>>>>> 3ebc4100a24bd6b8711dd61ede6bc0005a5e26e6:Fronted/src/Components/Login.jsx
        navigate('/admin-dashboard')
      } else {
        navigate('/home')
      }
    } catch (error) {
      if (error.response) {
        setError(error.response.data.detail || 'Invalid credentials')
      } else {
        setError('Backend not reachable. Please check if the server is running.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    {
      icon: Activity,
      title: 'Real-time Monitoring',
      description:
        'Monitor all transactions in real-time with instant alerts for suspicious activities'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description:
        'Leverage AI-powered analytics to identify patterns and prevent fraud before it happens'
    },
    {
      icon: Users,
      title: 'Multi-user Support',
      description:
        'Collaborate with your team using role-based access controls and permissions'
    },
    {
      icon: IndianRupeeIcon,
      title: 'Cost Savings',
      description:
        'Reduce fraud losses by up to 95% with our intelligent detection algorithms'
    }
  ]

  return (
<<<<<<< HEAD:Frontend/src/Components/Login.jsx
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex">
      {/* LEFT SECTION */}
=======
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-blue-900 to-slate-900 flex">
      {/* Left Section - Branding & Features */}
>>>>>>> 3ebc4100a24bd6b8711dd61ede6bc0005a5e26e6:Fronted/src/Components/Login.jsx
      <div className="flex-1 p-12 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-4 mb-10">
            <div className="relative inline-flex items-center justify-center rounded-[1.6rem] p-[3px]">
              <div className="absolute inset-0 rounded-[1.6rem] bg-sky-500/80 blur-xl opacity-70" />
              <div className="relative w-16 h-16 rounded-[1.4rem] bg-sky-500 shadow-[0_18px_40px_rgba(56,189,248,0.85)] flex items-center justify-center overflow-hidden">
                <img
                  src={logo}
                  alt="Anomalyze logo"
                  className="w-[85%] h-[85%] object-cover rounded-[1.1rem]"
                />
              </div>
            </div>

            <div className="leading-tight">
              <span className="block text-[1.7rem] font-extrabold tracking-[0.28em] uppercase text-cyan-300">
                Anomalyze
              </span>
              <span className="mt-1 block text-[0.72rem] tracking-[0.35em] uppercase text-cyan-400/85">
                Fraud Detection Systems
              </span>
            </div>
          </div>

          {/* Headings */}
          <div className="max-w-2xl mb-12">
            <h2 className="text-white text-5xl font-bold mb-4">
              Protect Your Business
            </h2>
            <h3 className="text-cyan-400 text-4xl font-bold mb-6">
              From Financial Fraud
            </h3>
            <p className="text-blue-200 text-lg">
              Secure your transactions with AI-powered fraud detection.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-6 max-w-2xl">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-6"
              >
                <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h4 className="text-white font-semibold mb-2">
                  {feature.title}
                </h4>
                <p className="text-slate-400 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-slate-500 text-sm mt-10">
          © 2025 Fraud Detection System. All rights reserved.
        </div>
      </div>

      {/* RIGHT SECTION – LOGIN FORM */}
      <div className="w-[480px] bg-slate-900/80 border-l border-slate-800 p-12 flex items-center">
        <div className="w-full">
          <h2 className="text-white text-3xl font-bold mb-2">Welcome back</h2>
          <p className="text-slate-400 mb-8">
            Sign in to access your dashboard
          </p>

          <form onSubmit={handleSubmit}>
            {/* ROLE */}
            <div className="mb-6">
<<<<<<< HEAD:Frontend/src/Components/Login.jsx
              <label className="text-slate-400 text-sm mb-3 block">
                Login as
              </label>
              <button
                type="button"
                onClick={() => setUserRole('Risk Analyst')}
                className={`w-full py-3 rounded-lg font-medium ${
                  userRole === 'Risk Analyst'
                    ? 'bg-cyan-500 text-slate-900'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Risk Analyst
              </button>
            </div>

            {/* EMAIL */}
=======
              
              <div className="grid grid-cols-2 gap-3">
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Email Input */}
>>>>>>> 3ebc4100a24bd6b8711dd61ede6bc0005a5e26e6:Fronted/src/Components/Login.jsx
            <div className="mb-6">
              <label className="text-slate-400 text-sm mb-2 block">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg py-3 pl-11"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="mb-4">
              <label className="text-slate-400 text-sm mb-2 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg py-3 pl-11 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* REMEMBER ME */}
            <div className="flex items-center mb-6">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2"
              />
              <span className="text-slate-400 text-sm">Remember me</span>
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
<<<<<<< HEAD:Frontend/src/Components/Login.jsx
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              Sign in <ArrowRight />
=======
              disabled={isLoading}
              className={`w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
              <ArrowRight className="w-5 h-5" />
>>>>>>> 3ebc4100a24bd6b8711dd61ede6bc0005a5e26e6:Fronted/src/Components/Login.jsx
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
