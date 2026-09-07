import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercept requests to inject Auth and Org headers
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  const orgId = useAuthStore.getState().organizationId

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  if (orgId) {
    config.headers['X-Organization-Id'] = orgId
  }

  return config
})

// Handle 401s
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
