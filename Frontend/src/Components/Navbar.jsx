import React, { useState, useRef, useEffect } from 'react'
import { Bell, User, LogOut, Mail, Phone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from './AuthContext'

const Navbar = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleLogout = () => {
    logout()
    setShowDropdown(false)
    navigate('/')
  }

  return (
    <nav className="relative w-full bg-[#0B1020]/95 backdrop-blur-xl border-b border-slate-800 px-8 py-3.5 flex items-center justify-between shadow-[0_12px_40px_rgba(15,23,42,0.9)] z-[1000]">
      {/* Left Section - Logo and Title */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="relative inline-flex items-center justify-center rounded-[1.6rem] p-[3px] focus:outline-none focus:ring-2 focus:ring-sky-400/70 focus:ring-offset-2 focus:ring-offset-[#0B1020]"
        >
          <div className="absolute inset-0 rounded-[1.6rem] bg-sky-500/80 blur-xl opacity-70" />
          <div className="relative w-16 h-16 rounded-[1.4rem] bg-sky-500 shadow-[0_18px_40px_rgba(56,189,248,0.85)] flex items-center justify-center overflow-hidden">
            <img
              src={logo}
              alt="Anomalyze logo"
              className="w-[85%] h-[85%] object-cover rounded-[1.1rem]"
            />
          </div>
        </button>
        <div className="leading-tight">
          <span className="block text-[1.9rem] font-extrabold tracking-[0.25em] uppercase text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.9)]">
            Anomalyze
          </span>
          <span className="mt-0.5 block text-[0.7rem] tracking-[0.35em] uppercase text-cyan-400/80 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">
            Fraud Detection System
          </span>
        </div>
      </div>

      {/* Right Section - Notifications and Profile */}
      <div className="flex items-center gap-6">
        {/* Notification Bell with Badge */}
        <div className="relative cursor-pointer group z-[1001]" onClick={() => navigate('/alerts')}>
          <div className="p-2 rounded-lg hover:bg-slate-800/60 transition-all">
            <Bell className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" strokeWidth={2} />
          </div>
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/60 border-2 border-[#0B1020]">
            <span className="text-white text-xs font-bold">1</span>
          </span>
        </div>

        {/* User Profile Icon with Dropdown */}
        <div className="relative z-[1001]" ref={dropdownRef}>
          <div
            className="w-11 h-11 bg-slate-900/80 border border-slate-700/70 rounded-full flex items-center justify-center cursor-pointer hover:bg-slate-800 hover:border-slate-500 transition-all"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <User className="w-6 h-6 text-slate-300" strokeWidth={2} />
          </div>

          {/* Dropdown Menu */}
          {showDropdown && user && (
            <div className="absolute right-0 mt-3 w-80 bg-slate-900/98 backdrop-blur-xl rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.9)] border border-slate-700/50 py-2 z-[1002]">
              {/* User Info Section */}
              <div className="px-5 py-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 bg-sky-500/20 border border-sky-500/30 rounded-full flex items-center justify-center">
                    <User className="w-7 h-7 text-sky-400" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-lg">{user.name}</p>
                    <p className="text-xs text-sky-400 font-medium">{user.role}</p>
                  </div>
                </div>

                {/* User Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm group">
                    <div className="w-8 h-8 bg-slate-800/60 rounded-lg flex items-center justify-center group-hover:bg-slate-700/60 transition-colors">
                      <Mail className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-slate-300">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm group">
                    <div className="w-8 h-8 bg-slate-800/60 rounded-lg flex items-center justify-center group-hover:bg-slate-700/60 transition-colors">
                      <Phone className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-slate-300">{user.contact}</span>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <div className="px-3 py-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/30"
                >
                  <LogOut className="w-5 h-5" strokeWidth={2} />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
