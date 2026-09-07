import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Plus, Trash2 } from 'lucide-react'
import apiClient from '../../api/client'

interface CreateSalesOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateSalesOrderModal({ isOpen, onClose, onSuccess }: CreateSalesOrderModalProps) {
  const [customerId, setCustomerId] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [items, setItems] = useState([{ product_id: '', warehouse_id: '', quantity: 1, unit_price: 0 }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get('/customers')
      return res.data
    },
    enabled: isOpen,
  })

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products')
      return res.data
    },
    enabled: isOpen,
  })

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses')
      return res.data
    },
    enabled: isOpen,
  })

  useEffect(() => {
    if (warehouses?.length > 0) {
      const mainWarehouse = warehouses.find((w: any) => w.name === 'Main Warehouse')
      const defaultWarehouseId = mainWarehouse ? mainWarehouse.id : warehouses[0].id
      setItems(currentItems => 
        currentItems.map(item => 
          item.warehouse_id === '' ? { ...item, warehouse_id: defaultWarehouseId } : item
        )
      )
    }
  }, [warehouses])

  if (!isOpen) return null

  const addItem = () => {
    const mainWarehouse = warehouses?.find((w: any) => w.name === 'Main Warehouse')
    const defaultWarehouseId = mainWarehouse ? mainWarehouse.id : (warehouses?.[0]?.id || '')
    setItems([...items, { product_id: '', warehouse_id: defaultWarehouseId, quantity: 1, unit_price: 0 }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!customerId) {
      setError('Please select a customer.')
      return
    }

    if (items.length === 0) {
      setError('Order must have at least one item.')
      return
    }

    for (let item of items) {
      if (!item.product_id || !item.warehouse_id || item.quantity <= 0 || item.unit_price < 0) {
        setError('Please fill all item fields with valid values.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/sales-orders/', {
        customer_id: customerId,
        order_number: orderNumber || `SO-${Math.floor(Math.random() * 10000)}`,
        items: items
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create sales order')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create Sales Order</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          <form id="so-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                  disabled={isLoadingCustomers}
                  required
                >
                  <option value="">Select a customer...</option>
                  {customers?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Order Number (Optional)</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-gray-900">Order Items</h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus size={16} /> Add Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                    <div className="grid grid-cols-4 gap-3 flex-1">
                      <div className="space-y-1 col-span-1">
                        <label className="block text-xs font-medium text-gray-700">Product</label>
                        <select
                          value={item.product_id}
                          onChange={(e) => {
                             const p = products?.find((prod: any) => prod.id === e.target.value);
                             const newItems = [...items];
                             newItems[idx] = { 
                               ...newItems[idx], 
                               product_id: e.target.value,
                               unit_price: p ? (p.selling_price || 0) : newItems[idx].unit_price
                             };
                             setItems(newItems);
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                          required
                        >
                          <option value="">Select product...</option>
                          {products?.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-1 col-span-1">
                        <label className="block text-xs font-medium text-gray-700">Warehouse</label>
                        <select
                          value={item.warehouse_id}
                          onChange={(e) => updateItem(idx, 'warehouse_id', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                          required
                        >
                          <option value="">Select warehouse...</option>
                          {warehouses?.map((w: any) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Unit Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                          required
                        />
                      </div>
                    </div>
                    
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="mt-6 text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex justify-end">
                 <div className="text-right">
                    <span className="text-sm text-gray-500">Total:</span>
                    <span className="ml-2 text-lg font-bold text-gray-900">
                      ${items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
                    </span>
                 </div>
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
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
            form="so-form"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Order...' : 'Create Sales Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
