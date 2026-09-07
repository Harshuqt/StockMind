import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import apiClient from '../../api/client'

interface AdjustStockModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  product: any
}

export default function AdjustStockModal({ isOpen, onClose, onSuccess, product }: AdjustStockModalProps) {
  const [productName, setProductName] = useState(product?.name || '')
  const [reorderPoint, setReorderPoint] = useState<number | ''>(product?.reorder_point ?? '')
  const [warehouseId, setWarehouseId] = useState('')
  const [transactionType, setTransactionType] = useState('STOCK_IN')
  const [quantityChanged, setQuantityChanged] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: warehouses, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses')
      return res.data
    },
    enabled: isOpen,
  })

  useEffect(() => {
    if (warehouses?.length > 0 && !warehouseId) {
      const mainWarehouse = warehouses.find((w: any) => w.name === 'Main Warehouse')
      setWarehouseId(mainWarehouse ? mainWarehouse.id : warehouses[0].id)
    }
  }, [warehouses, warehouseId])

  useEffect(() => {
    if (product) {
      setProductName(product.name)
      setReorderPoint(product.reorder_point)
      setQuantityChanged('')
      setNotes('')
    }
  }, [product, isOpen])

  if (!isOpen || !product) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const hasDetailsChanged = productName !== product.name || reorderPoint !== product.reorder_point
    const hasStockAdjustment = quantityChanged !== ''

    if (!hasDetailsChanged && !hasStockAdjustment) {
      setError('Please make a change to submit.')
      return
    }

    if (hasStockAdjustment && !warehouseId) {
      setError('Please select a warehouse to adjust stock.')
      return
    }

    setIsSubmitting(true)
    try {
      const promises = []
      
      if (hasDetailsChanged) {
        promises.push(
          apiClient.put(`/products/${product.id}`, {
            name: productName,
            reorder_point: Number(reorderPoint)
          })
        )
      }

      if (hasStockAdjustment) {
        const isSet = transactionType === 'SET' || transactionType === 'CORRECTION'
        const finalQuantity = transactionType === 'STOCK_OUT' 
          ? -Math.abs(Number(quantityChanged)) 
          : Number(quantityChanged)

        promises.push(
          apiClient.post('/inventory/adjust', {
            product_id: product.id,
            warehouse_id: warehouseId,
            transaction_type: isSet ? 'SET' : transactionType,
            ...(isSet ? { new_quantity: Number(quantityChanged) } : { quantity_changed: finalQuantity }),
            notes: notes,
          })
        )
      }

      await Promise.all(promises)
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to apply changes')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Product & Adjust Stock</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700">Adjust details for SKU: {product.sku}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Product Name</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Reorder Point</label>
            <input
              type="number"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
              required
            />
          </div>

          <div className="pt-2 border-t border-gray-200 mt-4 mb-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Adjust Inventory (Optional)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Warehouse</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                disabled={isLoadingWarehouses}
              >
                <option value="">Select a warehouse...</option>
                {warehouses?.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
              >
                <option value="STOCK_IN">Add Stock</option>
                <option value="STOCK_OUT">Remove Stock</option>
                <option value="SET">Set Exact</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              {transactionType === 'SET' || transactionType === 'CORRECTION' ? 'New Total Quantity' : 'Quantity to Add/Remove'}
            </label>
            <input
              type="number"
              value={quantityChanged}
              onChange={(e) => setQuantityChanged(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
              placeholder="Enter quantity (leave blank to skip)"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none text-gray-900 bg-white"
              rows={3}
              placeholder="Reason for adjustment"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
