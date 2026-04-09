import React from 'react'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Show from './Show'


const Home = () => {
  return (
    <div className="flex flex-col h-screen bg-linear-to-br from-slate-950 via-slate-900 to-sky-950">
      {/* Navbar at the top */}
      <Navbar />
      
      {/* Content area with Sidebar and Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          {/* Your page content goes here */}
          <Show/>
        </main>
      </div>
    </div>
  )
}

export default Home
