import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Plus, Trash2 } from 'lucide-react'
import apiClient from '../../api/client'

interface CreatePOModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreatePOModal({ isOpen, onClose, onSuccess }: CreatePOModalProps) {
  const [supplierId, setSupplierId] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [expectedDelivery, setExpectedDelivery] = useState('')
  const [items, setItems] = useState([{ product_id: '', ordered_quantity: 1, unit_cost: 0 }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers')
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

  // We actually don't need warehouse selection for creating a PO!
  // Oh wait, POs don't select warehouse on creation, they select warehouse when RECEIVING.
  if (!isOpen) return null

  const addItem = () => {
    setItems([...items, { product_id: '', ordered_quantity: 1, unit_cost: 0 }])
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

    if (!supplierId) {
      setError('Please select a supplier.')
      return
    }

    if (items.length === 0) {
      setError('PO must have at least one item.')
      return
    }

    for (let item of items) {
      if (!item.product_id || item.ordered_quantity <= 0 || item.unit_cost < 0) {
        setError('Please fill all item fields with valid values.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      await apiClient.post('/purchase-orders/', {
        supplier_id: supplierId,
        po_number: poNumber || `PO-${Math.floor(Math.random() * 10000)}`,
        expected_delivery: expectedDelivery || undefined,
        items: items
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create PO')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create Purchase Order</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          <form id="po-form" onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                  disabled={isLoadingSuppliers}
                  required
                >
                  <option value="">Select supplier...</option>
                  {suppliers?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.company_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">PO Number</label>
                <input
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Expected Delivery</label>
                <input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
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
                    <div className="grid grid-cols-3 gap-3 flex-1">
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
                               unit_cost: p ? (p.cost_price || 0) : newItems[idx].unit_cost
                             };
                             setItems(newItems);
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                          required
                        >
                          <option value="">Select product...</option>
                          {products?.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={item.ordered_quantity}
                          onChange={(e) => updateItem(idx, 'ordered_quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 bg-white"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">Unit Cost</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={(e) => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
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
                      ${items.reduce((sum, item) => sum + (item.ordered_quantity * item.unit_cost), 0).toFixed(2)}
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
            form="po-form"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating PO...' : 'Create Purchase Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
