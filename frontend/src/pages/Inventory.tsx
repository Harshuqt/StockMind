import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import { Package, Search } from 'lucide-react'
import ProductModal from '../components/modals/ProductModal'
import AdjustStockModal from '../components/modals/AdjustStockModal'

export default function Inventory() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)

  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products')
      return res.data
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your product catalog and global stock levels.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
        >
          Add Product
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search products by name or SKU..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading products...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">SKU</th>
                  <th className="px-6 py-3 font-medium text-right">Current Stock</th>
                  <th className="px-6 py-3 font-medium text-right">Reorder Point</th>
                  <th className="px-6 py-3 font-medium text-right">Price</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products?.length > 0 ? (
                  products.map((product: any) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                          <Package size={20} />
                        </div>
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{product.sku}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                        {product.current_stock}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 text-right">{product.reorder_point}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">${product.selling_price}</td>
                      <td className="px-6 py-4 text-center">
                        {product.current_stock <= product.reorder_point ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button 
                          onClick={() => {
                            setSelectedProduct(product)
                            setIsAdjustModalOpen(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No products found. Add your first product to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdjustStockModal 
        isOpen={isAdjustModalOpen} 
        onClose={() => setIsAdjustModalOpen(false)} 
        onSuccess={() => refetch()} 
        product={selectedProduct} 
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
