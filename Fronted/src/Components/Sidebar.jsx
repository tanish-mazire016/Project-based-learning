import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutGrid, FileText, AlertTriangle, BarChart3, Shield, Settings, LogOut } from 'lucide-react'

const Sidebar = () => {
  const location = useLocation()

  const menuItems = [
    { name: 'Overview',      icon: LayoutGrid,   route: '/overview' },
    { name: 'Transactions',  icon: FileText,     route: '/transactions' },
    { name: 'Alerts',        icon: AlertTriangle,route: '/alerts' },
    { name: 'Analytics',     icon: BarChart3,    route: '/analytics' },
  ]

  return (
    <aside className="w-64 h-full bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 py-6 shadow-xl flex flex-col">
      {/* Main menu */}
      <nav className="flex flex-col gap-2 px-4 flex-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.route

          return (
            <Link
              key={item.name}
              to={item.route}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-sky-500/20 text-sky-400 shadow-lg shadow-sky-500/20 border border-sky-500/40'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'}`}
                strokeWidth={2}
              />
              <span className="font-medium text-[15px]">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout button at bottom */}
      <div className="mt-4 px-4">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" strokeWidth={2} />
          <span className="font-medium text-[15px]">Logout</span>
        </Link>
      </div>
    </aside>
  )
}

export default Sidebar
