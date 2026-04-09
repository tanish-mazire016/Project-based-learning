export const parseDate = (dateString) => {
  if (!dateString) return null
  
  try {
    // Handle format: "2025-01-08 12:44:26"
    const [datePart, timePart] = dateString.split(' ')
    const [year, month, day] = datePart.split('-')
    const [hour, minute, second] = timePart.split(':')
    
    return new Date(year, month - 1, day, hour, minute, second || 0)
  } catch (error) {
    console.error('Error parsing date:', dateString, error)
    return null
  }
}
export const getRelativeTime = (dateString) => {
  const date = parseDate(dateString)
  if (!date) return 'Unknown'
  
  const now = new Date()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)
  
  if (diffSeconds < 60) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`
}

/**
 * Format date for display (e.g., "Jan 8, 2025 12:44 PM")
 */
export const formatDate = (dateString) => {
  const date = parseDate(dateString)
  if (!date) return 'Unknown'
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format date for charts (e.g., "Jan 8")
 */
export const formatDateShort = (dateString) => {
  const date = parseDate(dateString)
  if (!date) return 'Unknown'
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Get date only (YYYY-MM-DD)
 */
export const getDateOnly = (dateString) => {
  const date = parseDate(dateString)
  if (!date) return 'Unknown'
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Get hour from time (0-23)
 */
export const getHour = (dateString) => {
  const date = parseDate(dateString)
  if (!date) return 0
  
  return date.getHours()
}

/**
 * Sort transactions by date (newest first)
 */
export const sortByDateDescending = (transactions) => {
  return [...transactions].sort((a, b) => {
    const dateA = parseDate(a.time)
    const dateB = parseDate(b.time)
    
    if (!dateA || !dateB) return 0
    return dateB - dateA // Newest first
  })
}

/**
 * Filter transactions by date range
 */
export const filterByDateRange = (transactions, startDate, endDate) => {
  return transactions.filter((tx) => {
    const txDate = parseDate(tx.time)
    if (!txDate) return false
    
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null
    
    if (start && txDate < start) return false
    if (end && txDate > end) return false
    
    return true
  })
}

/**
 * Group transactions by date
 */
export const groupByDate = (transactions) => {
  const grouped = {}
  
  transactions.forEach((tx) => {
    const date = getDateOnly(tx.time)
    if (!grouped[date]) {
      grouped[date] = []
    }
    grouped[date].push(tx)
  })
  
  return grouped
}
