import React, { createContext, useState, useContext } from 'react'
import Papa from 'papaparse'

const DataContext = createContext()

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

export const DataProvider = ({ children }) => {
  const [csvData, setCsvData] = useState([])
  const [csvFileName, setCsvFileName] = useState('')

  const generateUserId = (name) => {
    if (!name) return 'USR-000'
    const parts = name.trim().split(' ')
    const initials = parts.map(p => p[0]).join('').toUpperCase()
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    return `${initials}-${randomNum}`
  }

  const handleFileUpload = (file) => {
    if (!file) return

    setCsvFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        console.log('Raw CSV data:', result.data)

        // Transform the data to match expected format
        const transformedData = result.data.map((row) => {
          // Combine Date and Time fields
          const dateTime = `${row.Date || ''} ${row.Time || ''}`.trim()

          return {
            id: row.transaction_id || row.id || 'TXN-000',
            user: {
              name: row.user || 'Unknown User',
              userId: generateUserId(row.user)
            },
            amount: parseFloat(row.amount) || 0,
            location: row.location || 'Unknown',
            device: row.device || 'Unknown Device',
            riskScore: parseInt(row.risk_score || row.riskScore) || 0,
            status: row.status || 'Safe',
            time: dateTime || new Date().toLocaleString()
          }
        })

        console.log('Transformed data:', transformedData)
        setCsvData(transformedData)
      },
      error: (error) => {
        console.error('Error parsing CSV:', error)
        alert('Error reading CSV file. Please check the format.')
      }
    })
  }

  const clearData = () => {
    setCsvData([])
    setCsvFileName('')
  }

  return (
    <DataContext.Provider
      value={{
        csvData,
        csvFileName,
        handleFileUpload,
        clearData,
        setCsvData,
        setCsvFileName
      }}
    >
      {children}
    </DataContext.Provider>
  )
}
