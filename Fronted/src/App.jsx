import './App.css'
import React from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import UnknownRoute from './Components/UnknownRoute'
import Home from './Components/Home.jsx'
import Overview from './Components/Sidebar/Overview'
import Layout from './Components/Layout'
import Login from './Components/Login'
import Transactions from './Components/Sidebar/Transaction'
import Alerts from './Components/Sidebar/Alerts'
import Analytics from './Components/Sidebar/Analytics'
import ProtectedRoute from './Components/ProtectedRoute'
import { DataProvider } from './Components/Sidebar/DataContext.jsx'
import { AuthProvider } from './Components/AuthContext.jsx'

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Login />
    },
    {
      path: "/home",
      element: (
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      )
    },
    {
      path: "/overview",
      element: (
        <ProtectedRoute>
          <Layout>
            <Overview />
          </Layout>
        </ProtectedRoute>
      )
    },
    {
      path: "/transactions",
      element: (
        <ProtectedRoute>
          <Layout>
            <Transactions />
          </Layout>
        </ProtectedRoute>
      )
    },
    {
      path: "/alerts",
      element: (
        <ProtectedRoute>
          <Layout>
            <Alerts />
          </Layout>
        </ProtectedRoute>
      )
    },
    {
      path: "/analytics",
      element: (
        <ProtectedRoute>
          <Layout>
            <Analytics />
          </Layout>
        </ProtectedRoute>
      )
    },
    {
      path: "/*",
      element: (
        <Layout>
          <UnknownRoute />
        </Layout>
      )
    }
  ])

  return (
    <AuthProvider>
      <DataProvider>
        <RouterProvider router={router} />
      </DataProvider>
    </AuthProvider>
  )
}

export default App
