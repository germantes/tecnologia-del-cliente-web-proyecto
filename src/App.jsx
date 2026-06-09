import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { Header, Footer } from './components/header_footer'
import Homepage from './components/homepage'
import Cadenas from './components/cadenas'
import EditPage from './components/EditPage'

function LoginRedirect() {
  const token = sessionStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      window.location.replace('/html/index.html')
    }
  }, [token])

  if (token) {
    return <Navigate to="/homepage" replace />
  }

  return null
}

function RequireAuth({ children }) {
  const token = sessionStorage.getItem('token')

  useEffect(() => {
    if (!token) {
      window.location.replace('/html/index.html')
    }
  }, [token])

  if (!token) {
    return null
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginRedirect />} />

        <Route
          path="/homepage"
          element={
            <RequireAuth>
              <Header />
              <Homepage />
              <Footer />
            </RequireAuth>
          }
        />
        <Route
          path="/cadenas"
          element={
            <RequireAuth>
              <Header />
              <Cadenas />
              <Footer />
            </RequireAuth>
          }
        />
        <Route
          path="/edit/:entityType"
          element={
            <RequireAuth>
              <Header />
              <EditPage />
              <Footer />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App