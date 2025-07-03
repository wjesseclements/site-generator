'use client'

import { Template } from '@/lib/templates'

interface TemplateCardProps {
  template: Template
  onClick: () => void
}

export function TemplateCardV2({ template, onClick }: TemplateCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group relative p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 p-[1px]">
            <div className="w-full h-full rounded-lg bg-gray-900 flex items-center justify-center">
              <span className="text-2xl">{template.icon}</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{template.name}</h3>
            <span className="text-xs text-blue-400">{template.category}</span>
          </div>
        </div>
        
        <p className="text-sm text-gray-400 mb-4">{template.description}</p>
        
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
            {template.estimatedCost}
          </span>
          <span className="text-gray-500">{template.parameters.length} parameters</span>
        </div>
      </div>
    </div>
  )
}