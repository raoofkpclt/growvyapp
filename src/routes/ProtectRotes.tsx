import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase/firebase'
import type { User } from 'firebase/auth'

const ProtectRoutes = () => {
  const [loading, setLoading] = React.useState(true)
  const [user, setUser] = React.useState <User |null> (null)

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export default ProtectRoutes