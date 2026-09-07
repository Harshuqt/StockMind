import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import { Package, DollarSign, AlertTriangle, Clock, ShoppingCart } from 'lucide-react'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/dashboard')
      return res.data
    }
  })

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await apiClient.get('/alerts?status=UNREAD')
      return res.data
    }
  })

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading metrics...</div>

  const metrics = [
    { name: 'Total Inventory Value', value: `$${data?.total_inventory_value?.toLocaleString() || 0}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Total Products', value: data?.total_products || 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Today\'s Orders', value: data?.todays_orders || 0, icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Low Stock Items', value: data?.low_stock_count || 0, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { name: 'Pending POs', value: data?.pending_purchase_orders || 0, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map((metric) => (
          <div key={metric.name} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{metric.name}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-full ${metric.bg}`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <p className="text-gray-500 text-sm">Activity feed coming soon...</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-yellow-500 w-5 h-5" /> 
            Action Required
          </h3>
          <div className="space-y-4">
            {alerts && alerts.length > 0 ? (
              alerts.map((alert: any) => (
                <div key={alert.id} className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {alert.message}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No unread alerts.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
