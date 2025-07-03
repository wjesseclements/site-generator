'use client'

import { useState } from 'react'
import { Template, TemplateParameter } from '@/lib/templates'

interface TemplateModalProps {
  template: Template | null
  isOpen: boolean
  onClose: () => void
  onDeploy: (values: Record<string, any>) => void
}

export function TemplateModal({ template, isOpen, onClose, onDeploy }: TemplateModalProps) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [isDeploying, setIsDeploying] = useState(false)

  if (!template || !isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDeploying(true)
    
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

    const baseInputStyle = {
      width: '100%',
      padding: '0.75rem',
      background: 'rgba(31, 41, 55, 0.5)',
      border: '1px solid rgba(75, 85, 99, 0.5)',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '0.875rem',
      outline: 'none',
      transition: 'all 0.2s ease'
    }

    switch (param.type) {
      case 'text':
      case 'number':
        return (
          <input
            type={param.type}
            value={value}
            onChange={(e) => setValues({ ...values, [param.name]: param.type === 'number' ? parseInt(e.target.value) : e.target.value })}
            placeholder={param.placeholder}
            required={param.required}
            style={baseInputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.5)'
              e.currentTarget.style.background = 'rgba(31, 41, 55, 0.8)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.5)'
              e.currentTarget.style.background = 'rgba(31, 41, 55, 0.5)'
            }}
          />
        )
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setValues({ ...values, [param.name]: e.target.value })}
            required={param.required}
            style={baseInputStyle}
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
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={value === true}
              onChange={(e) => setValues({ ...values, [param.name]: e.target.checked })}
              style={{ marginRight: '0.5rem' }}
            />
            <span style={{ fontSize: '0.875rem', color: '#D1D5DB' }}>
              {param.description || 'Enable'}
            </span>
          </label>
        )
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 40,
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      />
      
      {/* Modal */}
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
        pointerEvents: 'none'
      }}>
        <div style={{
          background: 'linear-gradient(to bottom right, #1F2937, #111827)',
          border: '1px solid rgba(75, 85, 99, 0.5)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          maxWidth: '42rem',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.3s ease',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem',
            borderBottom: '1px solid rgba(75, 85, 99, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                {template.icon}
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#fff', margin: 0 }}>
                  {template.name}
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', margin: 0 }}>
                  {template.description}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(75, 85, 99, 0.2)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#6B7280'
              }}
            >
              ×
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {template.parameters.map((param) => (
                <div key={param.name}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#D1D5DB',
                    marginBottom: '0.5rem'
                  }}>
                    {param.label}
                    {param.required && <span style={{ color: '#EF4444', marginLeft: '0.25rem' }}>*</span>}
                  </label>
                  {renderField(param)}
                  {param.description && param.type !== 'boolean' && (
                    <p style={{
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#6B7280'
                    }}>
                      {param.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
            
            {/* Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(75, 85, 99, 0.3)'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                Estimated cost: <span style={{ fontWeight: '600', color: '#10B981' }}>{template.estimatedCost}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: 'rgba(75, 85, 99, 0.2)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    color: '#D1D5DB',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(75, 85, 99, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(75, 85, 99, 0.2)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeploying}
                  style={{
                    padding: '0.5rem 1.25rem',
                    background: isDeploying 
                      ? 'rgba(59, 130, 246, 0.5)' 
                      : 'linear-gradient(to right, #3B82F6, #8B5CF6)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: isDeploying ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isDeploying ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeploying) {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(59, 130, 246, 0.5)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {isDeploying && (
                    <span style={{
                      display: 'inline-block',
                      width: '14px',
                      height: '14px',
                      border: '2px solid transparent',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  )}
                  {isDeploying ? 'Deploying...' : 'Deploy Template'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}