'use client'

import { Template } from '@/lib/templates'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

interface TemplateCardProps {
  template: Template
  onClick: () => void
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="h-full"
    >
      <div
        onClick={onClick}
        className={cn(
          'relative h-full overflow-hidden rounded-2xl',
          'bg-gradient-to-br from-gray-900 to-gray-800',
          'border border-gray-700/50',
          'shadow-xl hover:shadow-2xl',
          'transition-all duration-300',
          'cursor-pointer group',
          'backdrop-blur-sm'
        )}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20" />
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} />
        </div>

        {/* Content */}
        <div className="relative p-8">
          {/* Icon and Title */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl">{template.icon}</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  {template.name}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {template.category}
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors transform group-hover:translate-x-1" />
          </div>

          {/* Description */}
          <p className="text-gray-300 text-sm mb-6 line-clamp-2">
            {template.description}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-gray-400">Est. {template.estimatedCost}</span>
              </div>
              <div className="text-gray-500">•</div>
              <span className="text-gray-400">{template.parameters.length} configs</span>
            </div>
            <div className="text-xs text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Configure →
            </div>
          </div>
        </div>

        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
        </div>
      </div>
    </motion.div>
  )
}