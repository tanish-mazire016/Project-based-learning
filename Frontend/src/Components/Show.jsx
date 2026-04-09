import React from 'react'
import Overview from './Sidebar/Overview'
import Transactions from './Sidebar/Transaction'
import Analytics from './Sidebar/Analytics'
import Alerts from './Sidebar/Alerts'

const Show = () => {
  return (
    <div className='bg-linear-to-br from-slate-900 via-blue-900 to-slate-900'>
      <Overview/>
      <Transactions />
      <Analytics />
      <Alerts />
    </div>
  )
}

export default Show
