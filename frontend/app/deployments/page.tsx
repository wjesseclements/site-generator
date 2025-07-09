'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DeploymentStatusEnhanced } from '@/components/deployment-status-enhanced';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedFetch } from '@/lib/auth';
import { templates } from '@/lib/templates';

interface Deployment {
  id: string;
  name: string;
  templateId: string;
  templateName?: string;
  status: 'PENDING' | 'INITIALIZING' | 'PLANNING' | 'DEPLOYING' | 'COMPLETED' | 'FAILED' | 'DESTROYING' | 'DESTROYED';
  createdAt: string;
  createdBy: string;
  parameters: Record<string, any>;
  description?: string;
  tags?: Record<string, string>;
  outputs?: Record<string, any>;
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
  const [deletingDeployment, setDeletingDeployment] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeployments();
    }
  }, [isAuthenticated]);

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/deployments`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch deployments');
      }
      
      const data = await response.json();
      
      // Map the deployments and enrich with template data
      const enrichedDeployments = data.deployments.map((deployment: any) => {
        const template = templates.find(t => t.id === deployment.templateId);
        return {
          ...deployment,
          templateName: template?.name || deployment.templateId,
          templateIcon: template?.icon || '📦'
        };
      });
      
      setDeployments(enrichedDeployments);
    } catch (err) {
      console.error('Error fetching deployments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load deployments');
    } finally {
      setLoading(false);
    }
  };

  const deleteDeployment = async (deploymentId: string) => {
    try {
      setDeletingDeployment(deploymentId);
      
      const response = await authenticatedFetch(
        `${process.env.NEXT_PUBLIC_API_URL}/deployments/${deploymentId}`,
        {
          method: 'DELETE'
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to delete deployment');
      }
      
      // Remove from local state
      setDeployments(prev => prev.filter(d => d.id !== deploymentId));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting deployment:', err);
      alert('Failed to delete deployment. Please try again.');
    } finally {
      setDeletingDeployment(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#94a3b8';
      case 'INITIALIZING':
        return '#f59e0b';
      case 'PLANNING':
        return '#3b82f6';
      case 'DEPLOYING':
        return '#8b5cf6';
      case 'COMPLETED':
        return '#10b981';
      case 'FAILED':
        return '#ef4444';
      case 'DESTROYING':
        return '#f97316';
      case 'DESTROYED':
        return '#6b7280';
      default:
        return '#94a3b8';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '⏳';
      case 'INITIALIZING':
        return '🔄';
      case 'PLANNING':
        return '📋';
      case 'DEPLOYING':
        return '🚀';
      case 'COMPLETED':
        return '✅';
      case 'FAILED':
        return '❌';
      case 'DESTROYING':
        return '🗑️';
      case 'DESTROYED':
        return '💀';
      default:
        return '❓';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Filter deployments based on search and status
  const filteredDeployments = deployments.filter(deployment => {
    const matchesSearch = deployment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deployment.templateName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || deployment.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getTemplate = (templateId: string) => {
    return templates.find(t => t.id === templateId);
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #0f172a, #000000, #0f172a)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#60A5FA' }}>
            Authentication Required
          </h1>
          <p style={{ color: '#9CA3AF', marginBottom: '2rem' }}>
            Please sign in to view your deployments
          </p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #0f172a, #000000, #0f172a)',
      color: '#fff',
      fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif'
    }}>
      {/* Enhanced Background Pattern */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
        `,
        pointerEvents: 'none'
      }} />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '3rem',
            paddingBottom: '2rem',
            borderBottom: '1px solid rgba(59, 130, 246, 0.1)'
          }}
        >
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #60A5FA 0%, #C084FC 50%, #34D399 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em'
            }}>
              My Deployments
            </h1>
            <p style={{ color: '#9CA3AF', fontSize: '1.125rem' }}>
              Manage and monitor your deployed infrastructure
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
            }}
          >
            ✨ New Deployment
          </button>
        </motion.header>

        {/* Search and Filter Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ flex: 1, minWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search deployments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: 'rgba(31, 41, 55, 0.5)',
                border: '1px solid rgba(75, 85, 99, 0.5)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.5)';
                e.currentTarget.style.background = 'rgba(31, 41, 55, 0.8)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.5)';
                e.currentTarget.style.background = 'rgba(31, 41, 55, 0.5)';
              }}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              background: 'rgba(31, 41, 55, 0.5)',
              border: '1px solid rgba(75, 85, 99, 0.5)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="INITIALIZING">Initializing</option>
            <option value="PLANNING">Planning</option>
            <option value="DEPLOYING">Deploying</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '4rem 2rem',
              textAlign: 'center'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                fontSize: '3rem',
                marginBottom: '1rem',
                display: 'inline-block'
              }}
            >
              ⚙️
            </motion.div>
            <p style={{ color: '#9CA3AF', fontSize: '1.125rem' }}>
              Loading your deployments...
            </p>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <p style={{ color: '#fca5a5', margin: 0, fontSize: '1rem' }}>
                {error}
              </p>
              <button
                onClick={fetchDeployments}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredDeployments.length === 0 && deployments.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: 'rgba(31, 41, 55, 0.3)',
              borderRadius: '20px',
              border: '1px solid rgba(75, 85, 99, 0.3)'
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚀</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#E5E7EB' }}>
              No deployments yet
            </h3>
            <p style={{ color: '#9CA3AF', marginBottom: '2rem', fontSize: '1.125rem' }}>
              Deploy your first website template to get started
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(to right, #10b981, #059669)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Create Your First Deployment
            </button>
          </motion.div>
        )}

        {/* Filtered Empty State */}
        {!loading && !error && filteredDeployments.length === 0 && deployments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: 'center',
              padding: '3rem 2rem',
              background: 'rgba(31, 41, 55, 0.3)',
              borderRadius: '20px',
              border: '1px solid rgba(75, 85, 99, 0.3)'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#E5E7EB' }}>
              No deployments found
            </h3>
            <p style={{ color: '#9CA3AF', fontSize: '1rem' }}>
              Try adjusting your search or filter criteria
            </p>
          </motion.div>
        )}

        {/* Deployments Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '1.5rem'
          }}
        >
          {filteredDeployments.map((deployment, index) => {
            const template = getTemplate(deployment.templateId);
            
            return (
              <motion.div
                key={deployment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                style={{
                  background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
                  border: '1px solid rgba(75, 85, 99, 0.3)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(59, 130, 246, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.3)';
                }}
              >
                {/* Card Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                      {template?.icon || '📦'}
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        margin: 0,
                        color: '#E5E7EB',
                        letterSpacing: '-0.01em'
                      }}>
                        {deployment.name}
                      </h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#9CA3AF',
                        margin: 0,
                        marginTop: '0.25rem'
                      }}>
                        {deployment.templateName}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: `rgba(${getStatusColor(deployment.status).slice(1).match(/.{2}/g)?.map(hex => parseInt(hex, 16)).join(', ')}, 0.1)`,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    border: `1px solid ${getStatusColor(deployment.status)}30`
                  }}>
                    <span style={{ fontSize: '0.875rem' }}>
                      {getStatusIcon(deployment.status)}
                    </span>
                    <span style={{
                      fontSize: '0.75rem',
                      color: getStatusColor(deployment.status),
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {deployment.status.toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {deployment.description && (
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#9CA3AF',
                    marginBottom: '1rem',
                    lineHeight: '1.5'
                  }}>
                    {deployment.description}
                  </p>
                )}

                {/* Parameters Preview */}
                {deployment.parameters && Object.keys(deployment.parameters).length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <h4 style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#D1D5DB',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Configuration
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      {Object.entries(deployment.parameters).slice(0, 3).map(([key, value]) => (
                        <span key={key} style={{
                          fontSize: '0.75rem',
                          color: '#9CA3AF',
                          background: 'rgba(55, 65, 81, 0.5)',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          border: '1px solid rgba(75, 85, 99, 0.3)'
                        }}>
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  marginTop: 'auto',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(75, 85, 99, 0.2)'
                }}>
                  <span>{formatRelativeTime(deployment.createdAt)}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDeployment(
                          selectedDeployment === deployment.id ? null : deployment.id
                        );
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '4px',
                        color: '#60A5FA',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                      }}
                    >
                      {selectedDeployment === deployment.id ? 'Hide' : 'View'}
                    </button>
                    
                    {(deployment.status === 'COMPLETED' || deployment.status === 'FAILED') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(deployment.id);
                        }}
                        style={{
                          padding: '0.25rem 0.5rem',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '4px',
                          color: '#fca5a5',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Status */}
                <AnimatePresence>
                  {selectedDeployment === deployment.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        marginTop: '1rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid rgba(75, 85, 99, 0.2)'
                      }}
                    >
                      <DeploymentStatusEnhanced
                        deploymentId={deployment.id}
                        initialStatus={deployment.status}
                        websocketUrl={process.env.NEXT_PUBLIC_WEBSOCKET_URL}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowDeleteConfirm(null);
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                  background: 'linear-gradient(to bottom right, #1F2937, #111827)',
                  borderRadius: '20px',
                  padding: '2rem',
                  maxWidth: '400px',
                  width: '90%',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#E5E7EB' }}>
                    Delete Deployment
                  </h3>
                  <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                    Are you sure you want to delete this deployment? This action cannot be undone.
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(75, 85, 99, 0.2)',
                      border: '1px solid rgba(75, 85, 99, 0.3)',
                      borderRadius: '8px',
                      color: '#D1D5DB',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(75, 85, 99, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(75, 85, 99, 0.2)';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteDeployment(showDeleteConfirm)}
                    disabled={deletingDeployment === showDeleteConfirm}
                    style={{
                      padding: '0.5rem 1rem',
                      background: deletingDeployment === showDeleteConfirm 
                        ? 'rgba(239, 68, 68, 0.5)' 
                        : 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: '#fca5a5',
                      cursor: deletingDeployment === showDeleteConfirm ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s ease',
                      opacity: deletingDeployment === showDeleteConfirm ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (deletingDeployment !== showDeleteConfirm) {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (deletingDeployment !== showDeleteConfirm) {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                      }
                    }}
                  >
                    {deletingDeployment === showDeleteConfirm ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}