import { Truck } from 'lucide-react'

export default function Suppliers() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="bg-purple-50 p-4 rounded-full mb-4">
        <Truck size={48} className="text-purple-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Suppliers Network</h2>
      <p className="text-gray-500 text-center max-w-md">
        We are building a comprehensive Supplier Management module to track vendors, performance metrics, and automated reorder integrations.
      </p>
      <div className="mt-6 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium text-gray-600">
        Coming Soon
      </div>
    </div>
  )
}
