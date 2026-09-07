import { useState, useEffect } from 'react'
import { X, Truck, CheckCircle, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../../api/client'

interface ViewPOModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  order: any
}

export default function ViewPOModal({ isOpen, onClose, onSuccess, order }: ViewPOModalProps) {
  const [progress, setProgress] = useState(0)
  const [isReceiving, setIsReceiving] = useState(false)
  
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const res = await apiClient.get('/warehouses')
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

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers')
      return res.data
    },
    enabled: isOpen,
  })

  const getProductName = (id: string) => {
    const p = products?.find((prod: any) => prod.id === id);
    return p ? p.name : id;
  }

  const getSupplierName = (id: string) => {
    const s = suppliers?.find((sup: any) => sup.id === id);
    return s ? s.company_name : id;
  }

  useEffect(() => {
    setProgress(0)
    if (isOpen && order && order.status !== 'Received') {
      // Simulate delivery progress
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 5 // increment by 5% every 300ms
        })
      }, 300)
      return () => clearInterval(interval)
    } else if (order?.status === 'Received') {
      setProgress(100)
    }
  }, [isOpen, order])

  useEffect(() => {
    // When progress hits 100%, trigger auto-receive if not already received
    if (progress === 100 && order?.status !== 'Received' && !isReceiving && warehouses?.length > 0) {
      handleAutoReceive()
    }
  }, [progress, order, warehouses])

  const handleAutoReceive = async () => {
    setIsReceiving(true)
    try {
      // Build the item mapping: purchase_order_item_id -> quantity
      const itemsMap: Record<string, number> = {}
      order.items.forEach((item: any) => {
        itemsMap[item.id] = item.ordered_quantity - (item.received_quantity || 0)
      })

      const mainWarehouse = warehouses.find((w: any) => w.name === 'Main Warehouse')
      const targetWarehouseId = mainWarehouse ? mainWarehouse.id : warehouses[0].id
      await apiClient.post(`/purchase-orders/${order.id}/receive`, {
        warehouse_id: targetWarehouseId,
        items: itemsMap
      })
      onSuccess() // refresh table
    } catch (err) {
      console.error("Auto-receive failed", err)
    } finally {
      setIsReceiving(false)
    }
  }

  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Truck size={20} className="text-blue-600" />
              PO Details: {order.po_number}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
              order.status === 'Received' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {order.status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors self-start">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Supplier</p>
              <p className="font-medium text-gray-900">{getSupplierName(order.supplier_id)}</p>
            </div>
            <div>
              <p className="text-gray-500">Created At</p>
              <p className="font-medium text-gray-900">{new Date(order.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-sm text-gray-700">
              Order Items
            </div>
            <ul className="divide-y divide-gray-200">
              {order.items?.map((item: any) => (
                <li key={item.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package size={20} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{getProductName(item.product_id)}</p>
                      <p className="text-xs text-gray-500">Unit Cost: ${item.unit_cost}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">Qty: {item.ordered_quantity}</p>
                    {order.status === 'Received' && (
                      <p className="text-xs text-green-600 font-medium flex items-center justify-end gap-1">
                        <CheckCircle size={12} /> Received
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              Delivery Progress
            </h4>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
              <div 
                className={`h-2.5 rounded-full transition-all duration-300 ease-linear ${order.status === 'Received' ? 'bg-green-600' : 'bg-blue-600'}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 flex justify-between">
              <span>Dispatched</span>
              {order.status === 'Received' ? (
                <span className="text-green-600 font-medium">Delivered & Restocked!</span>
              ) : (
                <span>{progress < 100 ? 'In Transit...' : 'Arriving...'}</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
