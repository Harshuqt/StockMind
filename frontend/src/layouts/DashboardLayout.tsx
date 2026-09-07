import { Outlet, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LayoutDashboard, Package, ShoppingCart, Truck, Users, Bot, LogOut } from 'lucide-react'

export default function DashboardLayout() {
  const { token, logout, user } = useAuthStore()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Sales Orders', path: '/sales', icon: ShoppingCart },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: Truck },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Suppliers', path: '/suppliers', icon: Users },
    { name: 'AI Assistant', path: '/ai-assistant', icon: Bot },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600">StockMind</h1>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="text-lg font-medium text-gray-800">
            {navItems.find(item => item.path === location.pathname)?.name || 'Dashboard'}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button 
              onClick={() => logout()}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
