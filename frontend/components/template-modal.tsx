'use client'

import { useState } from 'react'
import { Template, TemplateParameter } from '@/lib/templates'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'

interface TemplateModalProps {
  template: Template | null
  isOpen: boolean
  onClose: () => void
  onDeploy: (values: Record<string, any>) => void
}

export function TemplateModal({ template, isOpen, onClose, onDeploy }: TemplateModalProps) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [isDeploying, setIsDeploying] = useState(false)

  if (!template) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDeploying(true)
    
    // Initialize default values
    const formValues = { ...values }
    template.parameters.forEach(param => {
      if (!(param.name in formValues) && param.default !== undefined) {
        formValues[param.name] = param.default
      }
    })
    
    await onDeploy(formValues)
    setIsDeploying(false)
  }

  const renderField = (param: TemplateParameter) => {
    const value = values[param.name] ?? param.default ?? ''

    switch (param.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => setValues({ ...values, [param.name]: e.target.value })}
            placeholder={param.placeholder}
            required={param.required}
            className={cn(
              'w-full px-3 py-2 rounded-lg',
              'bg-gray-800 border border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'text-white placeholder-gray-500',
              'transition-colors'
            )}
          />
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => setValues({ ...values, [param.name]: parseInt(e.target.value) })}
            placeholder={param.placeholder}
            required={param.required}
            className={cn(
              'w-full px-3 py-2 rounded-lg',
              'bg-gray-800 border border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'text-white placeholder-gray-500',
              'transition-colors'
            )}
          />
        )
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setValues({ ...values, [param.name]: e.target.value })}
            required={param.required}
            className={cn(
              'w-full px-3 py-2 rounded-lg',
              'bg-gray-800 border border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              'text-white placeholder-gray-500',
              'transition-colors'
            )}
          >
            <option value="">Select...</option>
            {param.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      
      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => setValues({ ...values, [param.name]: e.target.checked })}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">
              {param.description || 'Enable'}
            </span>
          </label>
        )
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl blur-lg opacity-50" />
                    <div className="relative w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">{template.icon}</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {template.name}
                    </h2>
                    <p className="text-sm text-gray-400">
                      {template.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-white" />
                </button>
              </div>
              
              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-6">
                  {template.parameters.map((param) => (
                    <div key={param.name}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {param.label}
                        {param.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      {renderField(param)}
                      {param.description && param.type !== 'boolean' && (
                        <p className="mt-1 text-xs text-gray-500">
                          {param.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Footer */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
                  <div className="text-sm text-gray-400">
                    Estimated cost: <span className="font-semibold text-green-400">{template.estimatedCost}</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className={cn(
                        'px-4 py-2 text-sm font-medium text-gray-300',
                        'bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors',
                        'border border-gray-700'
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isDeploying}
                      className={cn(
                        'px-4 py-2 text-sm font-medium text-white',
                        'bg-gradient-to-r from-blue-600 to-purple-600',
                        'hover:from-blue-700 hover:to-purple-700',
                        'rounded-lg transition-all',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'flex items-center gap-2',
                        'shadow-lg shadow-blue-500/25'
                      )}
                    >
                      {isDeploying && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isDeploying ? 'Deploying...' : 'Deploy Template'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}