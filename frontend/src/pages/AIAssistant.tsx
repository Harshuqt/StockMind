import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import { Bot, RefreshCw, ShoppingCart } from 'lucide-react'

export default function AIAssistant() {
  const { data, isError, refetch, isFetching } = useQuery({
    queryKey: ['ai-po-suggestions'],
    queryFn: async () => {
      const res = await apiClient.get('/ai/suggestions/purchase-orders')
      return res.data
    },
    enabled: false, // Prevents fetching automatically on mount
    refetchOnWindowFocus: false, // Prevents fetching when switching tabs
  })

  // Fetch products and suppliers to map UUIDs to Names
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await apiClient.get('/products')
      return res.data
    }
  })

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await apiClient.get('/suppliers')
      return res.data
    }
  })

  const getProductName = (id: string) => {
    const p = products?.find((prod: any) => prod.id === id);
    return p ? p.name : id;
  }

  const getSupplierName = (id: string) => {
    const s = suppliers?.find((sup: any) => sup.id === id);
    return s ? s.company_name : id;
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleApprovePO = async (po: any) => {
    setIsSubmitting(true)
    try {
      const payload = {
        supplier_id: po.supplier_id,
        po_number: `PO-AI-${Math.floor(Math.random() * 10000)}`,
        expected_delivery: po.expected_delivery || undefined,
        items: po.items.map((item: any) => ({
          product_id: item.product_id,
          ordered_quantity: item.suggested_quantity,
          unit_cost: item.unit_cost || 0
        }))
      }
      await apiClient.post('/purchase-orders/', payload)
      alert("Purchase Order created successfully! Check the Purchase Orders tab.")
    } catch (err: any) {
      console.error(err)
      alert("Failed to create PO: " + (err.response?.data?.detail || err.message))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg p-6 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <Bot size={32} />
          <h2 className="text-2xl font-bold">Gemini AI Assistant</h2>
        </div>
        <p className="text-blue-100 max-w-2xl">
          The AI continually monitors your historical sales and current stock levels. It predicts when you will run out of stock and groups low-stock products by supplier to suggest optimal Purchase Orders.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Purchase Order Suggestions</h3>
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            {isFetching ? 'Analyzing Data...' : 'Refresh AI Analysis'}
          </button>
        </div>

        {isFetching ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500">
            <RefreshCw size={32} className="animate-spin mb-4 text-blue-500" />
            <p>Gemini is crunching your inventory transactions...</p>
          </div>
        ) : isError ? (
           <div className="p-4 bg-red-50 text-red-700 rounded-md">
             Failed to generate suggestions. Ensure GEMINI_API_KEY is configured on the backend.
           </div>
        ) : data?.suggestions?.length > 0 ? (
          <div className="space-y-6">
            {data.suggestions.map((po: any, idx: number) => (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-500 block">Suggested PO for Supplier</span>
                    <span className="font-medium text-gray-900">{getSupplierName(po.supplier_id)}</span>
                  </div>
                  <button 
                    onClick={() => handleApprovePO(po)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                  >
                    <ShoppingCart size={16} />
                    {isSubmitting ? 'Creating...' : 'Approve & Create PO'}
                  </button>
                </div>
                <div className="p-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Product Name</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Suggested Qty</th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">AI Reasoning</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {po.items.map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="py-3 text-sm font-medium text-gray-900">{getProductName(item.product_id)}</td>
                          <td className="py-3 text-sm font-medium text-blue-600">{item.suggested_quantity}</td>
                          <td className="py-3 text-sm text-gray-600 max-w-md">{item.reasoning}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Bot size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-1">AI Health Check</p>
            <p className="max-w-xl mx-auto">{data?.message || 'Your inventory is healthy! Gemini has analyzed your stock and found no urgent reorders needed.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
