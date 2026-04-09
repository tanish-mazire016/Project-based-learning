import React from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'


const Layout = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-Linear-to-br from-slate-950 via-slate-900 to-sky-950">
      {/* Fixed Navbar at the top */}
      <Navbar />
      
      {/* Content area with Sidebar and Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar */}
        <Sidebar />
        
        {/* Main content area - scrollable */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
