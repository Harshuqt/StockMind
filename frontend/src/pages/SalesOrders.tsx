import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import apiClient from '../api/client'
import { ShoppingCart, Search } from 'lucide-react'
import CreateSalesOrderModal from '../components/modals/CreateSalesOrderModal'

export default function SalesOrders() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/sales-orders')
      return res.data
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sales Orders</h2>
          <p className="text-gray-500 text-sm mt-1">Manage customer orders and shipments.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
        >
          Create Order
        </button>
      </div>

      <CreateSalesOrderModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => refetch()} 
      />

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search by order number..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading orders...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-3 font-medium">Order Number</th>
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium text-right">Total Amount</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders?.length > 0 ? (
                  orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-blue-600 flex items-center gap-2">
                        <ShoppingCart size={16} className="text-gray-400" />
                        {order.order_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{order.customer_id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        ${order.total_amount}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                          order.status === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'Shipped' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button className="text-blue-600 hover:text-blue-800 font-medium">View</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No sales orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
