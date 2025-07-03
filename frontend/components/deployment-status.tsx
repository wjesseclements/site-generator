'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebSocketManager, DeploymentStatusUpdate } from '@/lib/websocket';

interface DeploymentStatusProps {
  deploymentId: string;
  initialStatus?: string;
  websocketUrl?: string;
}

export function DeploymentStatus({ deploymentId, initialStatus = 'PENDING', websocketUrl }: DeploymentStatusProps) {
  const [status, setStatus] = useState(initialStatus);
  const [statusMessage, setStatusMessage] = useState('Preparing deployment...');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);

  useEffect(() => {
    if (!websocketUrl) return;

    const manager = new WebSocketManager(websocketUrl);
    setWsManager(manager);

    manager.connect()
      .then(() => {
        manager.subscribeToDeployment(deploymentId, (update: DeploymentStatusUpdate) => {
          setStatus(update.status);
          setStatusMessage(update.message);
          
          if (update.output) {
            setLogs(prev => [...prev, update.output!]);
          }
          
          if (update.error) {
            setError(update.error);
          }
        });
      })
      .catch(err => {
        console.error('Failed to connect to WebSocket:', err);
        setError('Failed to establish real-time connection');
      });

    return () => {
      manager.disconnect();
    };
  }, [deploymentId, websocketUrl]);

  const getStatusColor = () => {
    switch (status) {
      case 'PENDING':
        return '#94a3b8';
      case 'IN_PROGRESS':
        return '#3b82f6';
      case 'COMPLETED':
      case 'SUCCESS':
        return '#10b981';
      case 'FAILED':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'PENDING':
        return '⏳';
      case 'IN_PROGRESS':
        return '🔄';
      case 'COMPLETED':
      case 'SUCCESS':
        return '✅';
      case 'FAILED':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div style={{
      backgroundColor: '#1a1a2e',
      borderRadius: '10px',
      padding: '20px',
      border: `1px solid ${getStatusColor()}`,
      boxShadow: `0 0 20px ${getStatusColor()}33`
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <h3 style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
          Deployment Status
        </h3>
        <motion.div
          animate={{ rotate: status === 'IN_PROGRESS' ? 360 : 0 }}
          transition={{ duration: 2, repeat: status === 'IN_PROGRESS' ? Infinity : 0, ease: 'linear' }}
          style={{ fontSize: '2em' }}
        >
          {getStatusIcon()}
        </motion.div>
      </div>

      <div style={{
        backgroundColor: '#0a0a0a',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '15px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
            animation: status === 'IN_PROGRESS' ? 'pulse 2s infinite' : 'none'
          }} />
          <span style={{ 
            color: getStatusColor(), 
            fontWeight: 'bold',
            textTransform: 'uppercase',
            fontSize: '0.9em'
          }}>
            {status.replace('_', ' ')}
          </span>
        </div>
        <p style={{ opacity: 0.8, margin: 0 }}>{statusMessage}</p>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#7f1d1d',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '15px'
        }}>
          <p style={{ color: '#fca5a5', margin: 0, fontWeight: 'bold' }}>Error:</p>
          <p style={{ color: '#fca5a5', margin: '5px 0 0 0' }}>{error}</p>
        </div>
      )}

      {logs.length > 0 && (
        <div style={{
          backgroundColor: '#0a0a0a',
          padding: '15px',
          borderRadius: '8px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <p style={{ marginBottom: '10px', fontWeight: 'bold', opacity: 0.8 }}>
            Deployment Logs:
          </p>
          <AnimatePresence>
            {logs.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85em',
                  marginBottom: '5px',
                  opacity: 0.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {log}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
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