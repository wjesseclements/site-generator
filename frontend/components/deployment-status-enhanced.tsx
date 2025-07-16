'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebSocketManager, DeploymentStatusUpdate } from '@/lib/websocket';
import { AuthService } from '@/lib/auth';

interface DeploymentStatusProps {
  deploymentId: string;
  initialStatus?: string;
  websocketUrl?: string;
}

interface DeploymentStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  icon: string;
  duration?: number;
}

const DEPLOYMENT_STEPS: DeploymentStep[] = [
  {
    id: 'pending',
    title: 'Initializing',
    description: 'Setting up deployment environment',
    status: 'pending',
    icon: '🚀'
  },
  {
    id: 'initializing',
    title: 'Repository Setup',
    description: 'Cloning infrastructure templates',
    status: 'pending',
    icon: '📁'
  },
  {
    id: 'planning',
    title: 'Planning Infrastructure',
    description: 'Running terraform plan',
    status: 'pending',
    icon: '📋'
  },
  {
    id: 'deploying',
    title: 'Deploying Resources',
    description: 'Creating AWS infrastructure',
    status: 'pending',
    icon: '⚡'
  },
  {
    id: 'completed',
    title: 'Deployment Complete',
    description: 'Infrastructure ready for use',
    status: 'pending',
    icon: '✅'
  }
];

export function DeploymentStatusEnhanced({ deploymentId, initialStatus = 'PENDING', websocketUrl }: DeploymentStatusProps) {
  const [status, setStatus] = useState(initialStatus);
  const [statusMessage, setStatusMessage] = useState('Preparing deployment...');
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [steps, setSteps] = useState<DeploymentStep[]>(DEPLOYMENT_STEPS);
  const [terraformOutput, setTerraformOutput] = useState<string>('');
  const [outputs, setOutputs] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);
  const [showTerraformOutput, setShowTerraformOutput] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  useEffect(() => {
    if (!websocketUrl) return;

    const initializeWebSocket = async () => {
      try {
        // Get authentication token
        const authHeaders = await AuthService.getAuthHeaders();
        const token = authHeaders.Authorization?.replace('Bearer ', '');
        
        const manager = new WebSocketManager(websocketUrl, token);
        setWsManager(manager);

        await manager.connect();
        
        manager.subscribeToDeployment(deploymentId, (update: DeploymentStatusUpdate) => {
          setStatus(update.status);
          setStatusMessage(update.message);
          
          if (update.step) {
            setCurrentStep(update.step);
          }
          
          if (update.terraform_output) {
            setTerraformOutput(prev => prev + update.terraform_output);
          }
          
          if (update.outputs) {
            setOutputs(update.outputs);
          }
          
          if (update.error) {
            setError(update.error);
          }
          
          // Update step statuses based on current deployment status
          updateStepStatuses(update.status);
        });
      } catch (err) {
        console.error('Failed to connect to WebSocket:', err);
        setError('Failed to establish real-time connection');
      }
    };

    initializeWebSocket();

    return () => {
      if (wsManager) {
        wsManager.disconnect();
      }
    };
  }, [deploymentId, websocketUrl]);

  const updateStepStatuses = (currentStatus: string) => {
    setSteps(prevSteps => {
      const newSteps = [...prevSteps];
      
      // Reset all to pending first
      newSteps.forEach(step => {
        if (step.status !== 'completed' && step.status !== 'failed') {
          step.status = 'pending';
        }
      });
      
      // Update based on current status
      switch (currentStatus) {
        case 'PENDING':
          newSteps[0].status = 'active';
          break;
        case 'INITIALIZING':
          newSteps[0].status = 'completed';
          newSteps[1].status = 'active';
          break;
        case 'PLANNING':
          newSteps[0].status = 'completed';
          newSteps[1].status = 'completed';
          newSteps[2].status = 'active';
          break;
        case 'DEPLOYING':
          newSteps[0].status = 'completed';
          newSteps[1].status = 'completed';
          newSteps[2].status = 'completed';
          newSteps[3].status = 'active';
          break;
        case 'COMPLETED':
          newSteps.forEach(step => step.status = 'completed');
          break;
        case 'FAILED':
          const activeStep = newSteps.find(s => s.status === 'active');
          if (activeStep) {
            activeStep.status = 'failed';
          }
          break;
      }
      
      return newSteps;
    });
  };

  const getStepStatusColor = (stepStatus: string) => {
    switch (stepStatus) {
      case 'pending': return '#64748b';
      case 'active': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getOverallStatusColor = () => {
    switch (status) {
      case 'PENDING':
      case 'INITIALIZING':
      case 'PLANNING':
      case 'DEPLOYING':
        return '#3b82f6';
      case 'COMPLETED':
        return '#10b981';
      case 'FAILED':
        return '#ef4444';
      case 'DESTROYING':
        return '#f59e0b';
      case 'DESTROYED':
        return '#6b7280';
      default:
        return '#64748b';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div style={{
      backgroundColor: '#0f172a',
      borderRadius: '16px',
      padding: '24px',
      border: `1px solid ${getOverallStatusColor()}`,
      boxShadow: `0 0 24px ${getOverallStatusColor()}15`,
      fontFamily: 'var(--font-geist-sans), system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px'
      }}>
        <div>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            margin: '0 0 4px 0',
            color: '#f1f5f9'
          }}>
            Deployment Progress
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#64748b',
            margin: 0
          }}>
            {formatDuration(Date.now() - startTime)} elapsed
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: getOverallStatusColor(),
            animation: (status === 'INITIALIZING' || status === 'PLANNING' || status === 'DEPLOYING') ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{ 
            color: getOverallStatusColor(), 
            fontWeight: '600',
            fontSize: '0.875rem',
            textTransform: 'capitalize'
          }}>
            {status.toLowerCase().replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Progress Steps */}
      <div style={{ marginBottom: '24px' }}>
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: index < steps.length - 1 ? '20px' : '0',
              position: 'relative'
            }}
          >
            {/* Step Icon */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: step.status === 'active' ? getStepStatusColor(step.status) : 'transparent',
              border: `2px solid ${getStepStatusColor(step.status)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              marginRight: '16px',
              position: 'relative',
              zIndex: 1
            }}>
              {step.status === 'active' && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  style={{ fontSize: '16px' }}
                >
                  ⚡
                </motion.div>
              )}
              {step.status === 'completed' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ fontSize: '16px' }}
                >
                  ✅
                </motion.div>
              )}
              {step.status === 'failed' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{ fontSize: '16px' }}
                >
                  ❌
                </motion.div>
              )}
              {step.status === 'pending' && (
                <div style={{ fontSize: '16px', opacity: 0.4 }}>
                  {step.icon}
                </div>
              )}
            </div>

            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div style={{
                position: 'absolute',
                left: '19px',
                top: '40px',
                width: '2px',
                height: '20px',
                backgroundColor: step.status === 'completed' ? '#10b981' : '#374151'
              }} />
            )}

            {/* Step Content */}
            <div style={{ flex: 1 }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: step.status === 'active' ? '#f1f5f9' : step.status === 'completed' ? '#10b981' : '#64748b',
                margin: '0 0 4px 0'
              }}>
                {step.title}
              </h4>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748b',
                margin: 0
              }}>
                {step.description}
              </p>
              {step.status === 'active' && currentStep && (
                <p style={{
                  fontSize: '0.75rem',
                  color: '#3b82f6',
                  margin: '4px 0 0 0',
                  fontStyle: 'italic'
                }}>
                  {currentStep}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Status Message */}
      <div style={{
        backgroundColor: '#1e293b',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '16px',
        border: '1px solid #334155'
      }}>
        <p style={{ 
          color: '#e2e8f0', 
          margin: 0, 
          fontSize: '0.875rem',
          lineHeight: '1.5'
        }}>
          {statusMessage}
        </p>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: '#7f1d1d',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #991b1b'
          }}
        >
          <p style={{ color: '#fca5a5', margin: '0 0 8px 0', fontWeight: '600' }}>Deployment Error:</p>
          <p style={{ color: '#fca5a5', margin: 0, fontSize: '0.875rem', lineHeight: '1.5' }}>{error}</p>
        </motion.div>
      )}

      {/* Terraform Output */}
      {terraformOutput && (
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={() => setShowTerraformOutput(!showTerraformOutput)}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '12px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#334155';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b';
            }}
          >
            {showTerraformOutput ? '▼' : '▶'} Terraform Output
          </button>
          
          <AnimatePresence>
            {showTerraformOutput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  backgroundColor: '#0f172a',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #1e293b',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}
              >
                <pre style={{
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {terraformOutput}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Deployment Outputs */}
      {outputs && status === 'COMPLETED' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            backgroundColor: '#064e3b',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #047857',
            marginTop: '16px'
          }}
        >
          <h4 style={{
            color: '#34d399',
            margin: '0 0 12px 0',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            🎉 Deployment Complete!
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(outputs).map(([key, value]) => (
              <div key={key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #047857'
              }}>
                <span style={{ color: '#a7f3d0', fontWeight: '500' }}>{key}:</span>
                <span style={{ color: '#d1fae5', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '0.875rem' }}>
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}