import { Routes, Route } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AIAssistant from './pages/AIAssistant'
import Inventory from './pages/Inventory'
import SalesOrders from './pages/SalesOrders'
import PurchaseOrders from './pages/PurchaseOrders'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="sales" element={<SalesOrders />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
      </Route>
    </Routes>
  )
}

export default App
