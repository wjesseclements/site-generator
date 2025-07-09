'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { templates } from '@/lib/templates'
import { TemplateModal } from '@/components/template-modal-v2'
import { Template } from '@/lib/templates'
import { useRouter } from 'next/navigation'
import { DeploymentStatusEnhanced } from '@/components/deployment-status-enhanced'
import { useAuth } from '@/contexts/auth-context'
import { AuthModal } from '@/components/auth-modal'
import { authenticatedFetch } from '@/lib/auth'

export default function Home() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentDeployment, setCurrentDeployment] = useState<{ id: string; name: string } | null>(null)
  const [showDeploymentStatus, setShowDeploymentStatus] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const router = useRouter()
  const { isAuthenticated, user, signOut } = useAuth()
  
  // Deployment indicator
  const buildTime = new Date().toISOString()

  const handleTemplateClick = (template: Template) => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }
    setSelectedTemplate(template)
    setIsModalOpen(true)
  }

  const handleDeploy = async (values: Record<string, any>) => {
    if (!selectedTemplate || !isAuthenticated) return
    
    try {
      // Create deployment via authenticated API
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_URL}/deployments`, {
        method: 'POST',
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
        fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'
      }}>
        {/* Enhanced Background Pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 60% 40%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
          `,
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            conic-gradient(from 45deg at 50% 50%, 
              rgba(59, 130, 246, 0.05) 0deg, 
              transparent 60deg, 
              rgba(139, 92, 246, 0.05) 120deg, 
              transparent 180deg, 
              rgba(16, 185, 129, 0.05) 240deg, 
              transparent 300deg, 
              rgba(59, 130, 246, 0.05) 360deg
            )
          `,
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {isAuthenticated ? (
                  <>
                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                      Welcome, {user?.name || user?.email}
                    </span>
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
                      }}
                    >
                      My Deployments
                    </button>
                    <button 
                      onClick={signOut}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#fca5a5',
                        padding: '0.5rem 1.25rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s ease',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setShowAuthModal(true)}
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
                    }}
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 2rem' }}>
          {/* Hero */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{ textAlign: 'center', marginBottom: '3rem' }}
          >
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              style={{
                fontSize: '3.5rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #60A5FA 0%, #C084FC 50%, #34D399 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
                marginBottom: '1.5rem',
                display: 'inline-block',
                letterSpacing: '-0.02em'
              }}
            >
              Choose Your Template
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              style={{ 
                fontSize: '1.25rem', 
                color: '#D1D5DB', 
                maxWidth: '48rem', 
                margin: '0 auto',
                lineHeight: '1.6',
                fontWeight: '400'
              }}
            >
              Select from our pre-configured templates and deploy your infrastructure in minutes.
              Each template is optimized for performance and includes automatic cost tracking.
            </motion.p>
          </motion.div>

          {/* Template Grid */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '1.5rem',
              maxWidth: '900px',
              margin: '0 auto'
            }}
          >
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                whileHover={{ 
                  y: -8, 
                  scale: 1.02,
                  transition: { duration: 0.3, ease: 'easeOut' }
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTemplateClick(template)}
                style={{
                  background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
                  border: '1px solid #374151',
                  borderRadius: '20px',
                  padding: '2rem',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(59, 130, 246, 0.25)';
                  e.currentTarget.style.borderColor = '#60A5FA';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #1F2937 0%, #1a202c 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = '#374151';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #1F2937 0%, #111827 100%)';
                }}
              >

                <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0 0 0.25rem 0', letterSpacing: '-0.01em' }}>
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
                  
                  <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                    {template.description}
                  </p>
                  
                  {/* Key Features Preview */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#D1D5DB', marginBottom: '0.5rem' }}>
                      Key Features
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {template.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} style={{
                          fontSize: '0.75rem',
                          color: '#9CA3AF',
                          marginBottom: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{
                            width: '3px',
                            height: '3px',
                            backgroundColor: '#60A5FA',
                            borderRadius: '50%',
                            flexShrink: 0
                          }} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Tech Stack Preview */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {template.techStack.slice(0, 3).map((tech, idx) => (
                        <span key={idx} style={{
                          fontSize: '0.625rem',
                          color: '#9CA3AF',
                          background: 'rgba(55, 65, 81, 0.3)',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '3px',
                          border: '1px solid rgba(75, 85, 99, 0.2)'
                        }}>
                          {tech}
                        </span>
                      ))}
                      {template.techStack.length > 3 && (
                        <span style={{
                          fontSize: '0.625rem',
                          color: '#6B7280',
                          padding: '0.125rem 0.375rem'
                        }}>
                          +{template.techStack.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: 'auto' }}>
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
              </motion.div>
            ))}
          </motion.div>

          {/* Features */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '2rem',
              marginTop: '5rem',
              maxWidth: '800px',
              margin: '5rem auto 0'
            }}
          >
            {[
              { icon: '⚡', title: 'Quick Deployment', desc: 'Deploy fully configured websites in under 5 minutes' },
              { icon: '💰', title: 'Cost Tracking', desc: 'Real-time cost monitoring with automatic tagging' },
              { icon: '🔒', title: 'Secure by Default', desc: 'Enterprise-grade security with AWS best practices' }
            ].map((feature, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 + idx * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                style={{ textAlign: 'center' }}
              >
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
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', lineHeight: '1.6' }}>
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
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

      {/* Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
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

            <DeploymentStatusEnhanced
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