'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DeploymentStatus } from '@/components/deployment-status';
import { useRouter } from 'next/navigation';

interface Deployment {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  status: string;
  createdAt: string;
  createdBy: string;
  parameters: Record<string, any>;
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/deployments`);
      // const data = await response.json();
      // setDeployments(data.deployments);
      
      // Mock data for now
      setDeployments([
        {
          id: '1',
          name: 'Analytics Dashboard',
          templateId: 'data-explorer',
          templateName: 'Data Explorer',
          status: 'COMPLETED',
          createdAt: new Date().toISOString(),
          createdBy: 'user@example.com',
          parameters: { siteName: 'analytics' }
        },
        {
          id: '2',
          name: 'Company Blog',
          templateId: 'company-pulse',
          templateName: 'Company Pulse',
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          createdBy: 'user@example.com',
          parameters: { siteName: 'blog' }
        }
      ]);
    } catch (err) {
      setError('Failed to load deployments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#94a3b8';
      case 'IN_PROGRESS':
        return '#3b82f6';
      case 'COMPLETED':
        return '#10b981';
      case 'FAILED':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0e27',
      color: '#e0e6ed',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          paddingBottom: '20px',
          borderBottom: '1px solid #30363d'
        }}>
          <div>
            <h1 style={{ fontSize: '2.5em', marginBottom: '10px' }}>
              My Deployments
            </h1>
            <p style={{ opacity: 0.8 }}>
              Manage and monitor your deployed sites
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#764ba2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#667eea'}
          >
            New Deployment
          </button>
        </header>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ fontSize: '3em', display: 'inline-block' }}
            >
              ⚙️
            </motion.div>
            <p style={{ marginTop: '20px', opacity: 0.8 }}>Loading deployments...</p>
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#7f1d1d',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <p style={{ color: '#fca5a5', margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && !error && deployments.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#161b22',
            borderRadius: '10px',
            border: '1px solid #30363d'
          }}>
            <p style={{ fontSize: '1.2em', marginBottom: '20px', opacity: 0.8 }}>
              No deployments yet
            </p>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Create Your First Deployment
            </button>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {deployments.map((deployment) => (
            <motion.div
              key={deployment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              style={{
                backgroundColor: '#161b22',
                borderRadius: '10px',
                padding: '20px',
                border: '1px solid #30363d',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onClick={() => setSelectedDeployment(
                selectedDeployment === deployment.id ? null : deployment.id
              )}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '15px'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.3em', marginBottom: '5px' }}>
                    {deployment.name}
                  </h3>
                  <p style={{ opacity: 0.6, fontSize: '0.9em' }}>
                    {deployment.templateName}
                  </p>
                </div>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor(deployment.status),
                  flexShrink: 0,
                  marginTop: '5px'
                }} />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.85em',
                opacity: 0.7
              }}>
                <span>{formatDate(deployment.createdAt)}</span>
                <span>{deployment.createdBy}</span>
              </div>

              {selectedDeployment === deployment.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: '20px' }}
                >
                  <DeploymentStatus
                    deploymentId={deployment.id}
                    initialStatus={deployment.status}
                    websocketUrl={process.env.NEXT_PUBLIC_WEBSOCKET_URL}
                  />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}