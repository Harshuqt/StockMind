import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import apiClient from '../api/client'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      // Create FormData as FastAPI expects form data for OAuth2PasswordRequestForm
      const formData = new FormData()
      formData.append('username', email) // OAuth2 uses username field
      formData.append('password', password)

      const response = await apiClient.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      
      const token = response.data.access_token
      
      // Fetch user profile with the new token
      const meResponse = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Fetch organizations
      const orgResponse = await apiClient.get('/organizations', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const user = meResponse.data
      const organizations = orgResponse.data
      
      setAuth(token, user, organizations.length > 0 ? organizations[0].id : '')
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Sign in to StockMind</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </button>
          </div>
          <div className="text-center text-sm">
             <span className="text-gray-600">Don't have an account? </span>
             <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">Register</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
