"use client";

import { useState, useCallback } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { Invoice, LineItem, ChargePreset } from '../../types'
import { Button } from '../ui/Button'
import { formatCurrency } from '../../lib/utils'
import { useToast } from '../ui/Toast'

interface InvoiceFormProps {
  invoice: Invoice
  chargePresets: ChargePreset[]
  onUpdate: (updates: Partial<Invoice>) => void
}

export function InvoiceForm({ invoice, chargePresets, onUpdate }: InvoiceFormProps) {
  const toast = useToast()
  const [showPresets, setShowPresets] = useState(false)
  const [customItemName, setCustomItemName] = useState('')
  const [customItemAmount, setCustomItemAmount] = useState('')

  const updateLineItems = useCallback(
    (items: LineItem[]) => {
      const subtotal = items.reduce((acc, item) => acc + item.amount * item.quantity, 0)
      const total = subtotal - (invoice.discount || 0)
      onUpdate({ line_items: items, subtotal, total })
    },
    [invoice.discount, onUpdate]
  )

  const addPreset = (preset: ChargePreset) => {
    const existing = invoice.line_items.find((li) => li.name === preset.name)
    if (existing) {
      const updated = invoice.line_items.map((li) =>
        li.name === preset.name ? { ...li, quantity: li.quantity + 1 } : li
      )
      updateLineItems(updated)
    } else {
      updateLineItems([
        ...invoice.line_items,
        { id: uuidv4(), name: preset.name, quantity: 1, amount: preset.amount },
      ])
    }
    setShowPresets(false)
  }

  const addCustomItem = () => {
    if (!customItemName.trim() || !customItemAmount) {
      toast.warning('Please enter item name and amount')
      return
    }
    const amount = parseFloat(customItemAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    updateLineItems([
      ...invoice.line_items,
      { id: uuidv4(), name: customItemName.trim(), quantity: 1, amount },
    ])
    setCustomItemName('')
    setCustomItemAmount('')
    setShowPresets(false)
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id)
      return
    }
    updateLineItems(invoice.line_items.map((li) => (li.id === id ? { ...li, quantity } : li)))
  }

  const removeItem = (id: string) => {
    updateLineItems(invoice.line_items.filter((li) => li.id !== id))
  }

  const updateDiscount = (discount: number) => {
    const clampedDiscount = Math.min(Math.max(discount, 0), invoice.subtotal)
    const total = invoice.subtotal - clampedDiscount
    onUpdate({ discount: clampedDiscount, total })
  }

  const groupedPresets = chargePresets
    .filter((p) => p.is_active)
    .reduce((acc, p) => {
      if (!acc[p.category]) acc[p.category] = []
      acc[p.category].push(p)
      return acc
    }, {} as Record<string, ChargePreset[]>)

  return (
    <div className="space-y-4">
      {/* Line Items Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-2.5">Description</th>
              <th className="text-center text-xs font-semibold text-slate-600 px-3 py-2.5 w-20">Qty</th>
              <th className="text-right text-xs font-semibold text-slate-600 px-4 py-2.5 w-28">Unit Price</th>
              <th className="text-right text-xs font-semibold text-slate-600 px-4 py-2.5 w-28">Total</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {invoice.line_items.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-sm text-slate-400">
                  No charges added yet. Click "Add Charge" to add items.
                </td>
              </tr>
            ) : (
              invoice.line_items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-sm text-slate-800 font-medium">{item.name}</td>
                  <td className="px-3 py-3 text-center">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                      className="w-14 text-center text-sm border border-slate-300 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">{formatCurrency(item.amount)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(item.amount * item.quantity)}
                  </td>
                  <td className="px-2 py-3">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Charge */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPresets(!showPresets)}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Charge
          <ChevronDown className={`w-3 h-3 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
        </Button>

        {showPresets && (
          <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
            {/* Presets */}
            <div className="max-h-64 overflow-y-auto">
              {Object.entries(groupedPresets).map(([category, presets]) => (
                <div key={category}>
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{category}</p>
                  </div>
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => addPreset(preset)}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-left transition-colors"
                    >
                      <span className="text-sm text-slate-700">{preset.name}</span>
                      <span className="text-sm font-semibold text-[#1D9E75]">{formatCurrency(preset.amount)}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Custom item */}
            <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-2">
              <p className="text-xs font-semibold text-slate-600">Custom Charge</p>
              <div className="flex gap-2">
                <input
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  placeholder="Item name"
                  className="flex-1 text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                />
                <input
                  type="number"
                  value={customItemAmount}
                  onChange={(e) => setCustomItemAmount(e.target.value)}
                  placeholder="₹"
                  className="w-20 text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
                />
                <button
                  onClick={addCustomItem}
                  className="px-3 py-1.5 bg-[#1D9E75] text-white text-sm rounded-lg hover:bg-[#0F6E56] transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Discount (₹)</span>
          <input
            type="number"
            min={0}
            value={invoice.discount || 0}
            onChange={(e) => updateDiscount(parseFloat(e.target.value) || 0)}
            className="w-28 text-right text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1D9E75]"
          />
        </div>
        <div className="border-t border-slate-200 pt-2 flex justify-between">
          <span className="text-base font-bold text-slate-900">Total</span>
          <span className="text-base font-bold text-[#1D9E75]">{formatCurrency(invoice.total)}</span>
        </div>
      </div>
    </div>
  )
}
