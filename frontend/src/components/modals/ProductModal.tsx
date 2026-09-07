import { useState } from 'react'
import { X } from 'lucide-react'
import apiClient from '../../api/client'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function ProductModal({ isOpen, onClose, onSuccess }: ProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    selling_price: '',
    cost_price: '',
    reorder_point: '10'
  })

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      await apiClient.post('/products', {
        name: formData.name,
        sku: formData.sku || `SKU-${Math.floor(Math.random() * 1000000)}`,
        selling_price: parseFloat(formData.selling_price) || 0,
        cost_price: parseFloat(formData.cost_price) || 0,
        reorder_point: parseInt(formData.reorder_point, 10) || 0,
        description: formData.category ? `Category: ${formData.category}` : "Added via UI"
      })
      
      onSuccess()
      onClose()
      // reset form
      setFormData({
        name: '',
        sku: '',
        category: '',
        selling_price: '',
        cost_price: '',
        reorder_point: '10'
      })
    } catch (err: any) {
      console.error(err)
      let errorMsg = "Failed to add product"
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMsg = err.response.data.detail
        } else if (Array.isArray(err.response.data.detail)) {
          errorMsg = err.response.data.detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ')
        }
      } else if (err.message) {
        errorMsg = err.message
      }
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
      <div className="relative w-full max-w-lg p-6 mx-4 bg-white rounded-xl shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-semibold text-gray-900">Add New Product</h3>
          <button 
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <input
              required
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white"
              placeholder="e.g., Wireless Mouse"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                SKU (Optional)
              </label>
              <input
                type="text"
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white"
                placeholder="Leave blank to auto-generate"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category (Optional)
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white"
                placeholder="e.g., Electronics"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cost_price" className="block text-sm font-medium text-gray-700 mb-1">
                Cost Price
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                id="cost_price"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <label htmlFor="selling_price" className="block text-sm font-medium text-gray-700 mb-1">
                Selling Price
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                id="selling_price"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reorder_point" className="block text-sm font-medium text-gray-700 mb-1">
              Reorder Point
            </label>
            <input
              required
              type="number"
              min="0"
              id="reorder_point"
              name="reorder_point"
              value={formData.reorder_point}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 bg-white"
            />
            <p className="mt-1 text-xs text-gray-500">
              When stock drops below this level, the product is marked as low stock.
            </p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Saving...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
