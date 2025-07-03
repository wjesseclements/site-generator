'use client'

import { useState } from 'react'
import { templates } from '@/lib/templates'
import { TemplateModal } from '@/components/template-modal-v2'
import { Template } from '@/lib/templates'
import { useRouter } from 'next/navigation'
import { DeploymentStatus } from '@/components/deployment-status'

export default function Home() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentDeployment, setCurrentDeployment] = useState<{ id: string; name: string } | null>(null)
  const [showDeploymentStatus, setShowDeploymentStatus] = useState(false)
  const router = useRouter()

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template)
    setIsModalOpen(true)
  }

  const handleDeploy = async (values: Record<string, any>) => {
    if (!selectedTemplate) return
    
    try {
      // Create deployment via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/deployments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add authentication header
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          name: values.siteName || values.name || 'Untitled Deployment',
          description: values.description,
          parameters: values,
          tags: {
            Template: selectedTemplate.name,
            Category: selectedTemplate.category
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create deployment')
      }

      const data = await response.json()
      const deployment = data.deployment

      // Show deployment status
      setCurrentDeployment({ id: deployment.id, name: deployment.name })
      setShowDeploymentStatus(true)
      setIsModalOpen(false)
      setSelectedTemplate(null)
    } catch (error) {
      console.error('Deployment failed:', error)
      alert('Failed to create deployment. Please try again.')
    }
  }

  return (
    <>
      
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #0f172a, #000000, #0f172a)',
        color: '#fff',
        position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 25% 25%, #1e293b 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, #1e3a8a 0%, transparent 50%)`,
          opacity: 0.4,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
          pointerEvents: 'none'
        }} />
        {/* Header */}
        <header style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
          padding: '1.5rem 0',
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(to bottom right, #3B82F6, #8B5CF6)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  ✨
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                  Site Generator Platform
                </h1>
              </div>
              <button 
              onClick={() => router.push('/deployments')}
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60A5FA',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}>
                My Deployments
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 2rem' }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #60A5FA, #C084FC)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
              marginBottom: '1rem',
              display: 'inline-block'
            }}>
              Choose Your Template
            </h2>
            <p style={{ fontSize: '1.125rem', color: '#9CA3AF', maxWidth: '42rem', margin: '0 auto' }}>
              Select from our pre-configured templates and deploy your infrastructure in minutes.
              Each template is optimized for performance and includes automatic cost tracking.
            </p>
          </div>

          {/* Template Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            maxWidth: '900px',
            margin: '0 auto'
          }}>
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                style={{
                  background: 'linear-gradient(to bottom right, #1F2937, #111827)',
                  border: '1px solid #374151',
                  borderRadius: '16px',
                  padding: '2rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(59, 130, 246, 0.25)';
                  e.currentTarget.style.borderColor = '#60A5FA';
                  e.currentTarget.style.background = 'linear-gradient(to bottom right, #1F2937, #1a202c)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = '#374151';
                  e.currentTarget.style.background = 'linear-gradient(to bottom right, #1F2937, #111827)';
                }}
              >

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      {template.icon}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0 0 0.25rem 0' }}>
                        {template.name}
                      </h3>
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#60A5FA',
                        background: 'rgba(59, 130, 246, 0.1)',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        {template.category}
                      </span>
                    </div>
                  </div>
                  
                  <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    {template.description}
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <span style={{ color: '#6B7280' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#10B981',
                        marginRight: '0.5rem'
                      }} />
                      Est. {template.estimatedCost}
                    </span>
                    <span style={{ color: '#6B7280' }}>
                      {template.parameters.length} configs
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginTop: '5rem',
            maxWidth: '800px',
            margin: '5rem auto 0'
          }}>
            {[
              { icon: '⚡', title: 'Quick Deployment', desc: 'Deploy fully configured websites in under 5 minutes' },
              { icon: '💰', title: 'Cost Tracking', desc: 'Real-time cost monitoring with automatic tagging' },
              { icon: '🔒', title: 'Secure by Default', desc: 'Enterprise-grade security with AWS best practices' }
            ].map((feature, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  margin: '0 auto 1rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  border: '1px solid rgba(59, 130, 246, 0.2)'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </main>

      </div>

      {/* Template Modal */}
      <TemplateModal
        template={selectedTemplate}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedTemplate(null)
        }}
        onDeploy={handleDeploy}
      />

      {/* Deployment Status Modal */}
      {showDeploymentStatus && currentDeployment && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowDeploymentStatus(false)
          }
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '16px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid #1e293b'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: 0 }}>
                Deploying: {currentDeployment.name}
              </h2>
              <button
                onClick={() => setShowDeploymentStatus(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '1.5em',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                ×
              </button>
            </div>

            <DeploymentStatus
              deploymentId={currentDeployment.id}
              initialStatus="PENDING"
              websocketUrl={process.env.NEXT_PUBLIC_WEBSOCKET_URL}
            />

            <div style={{
              marginTop: '20px',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowDeploymentStatus(false)
                  router.push('/deployments')
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                View All Deployments
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}