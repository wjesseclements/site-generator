'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

type AuthMode = 'signin' | 'signup' | 'confirm'

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')

  const { signIn, signUp, confirmSignUp, signInWithOAuth, resendConfirmationCode, isLoading, error, clearError } = useAuth()

  const handleClose = () => {
    setMode('signin')
    setEmail('')
    setPassword('')
    setName('')
    setConfirmationCode('')
    setPendingEmail('')
    clearError()
    onClose()
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signIn(email, password)
      handleClose()
    } catch (error) {
      // Error is handled by context
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await signUp(email, password, name)
      setPendingEmail(email)
      setMode('confirm')
    } catch (error) {
      // Error is handled by context
    }
  }

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await confirmSignUp(pendingEmail, confirmationCode)
      setMode('signin')
      setEmail(pendingEmail)
      setPendingEmail('')
      setConfirmationCode('')
    } catch (error) {
      // Error is handled by context
    }
  }

  const handleResendCode = async () => {
    try {
      await resendConfirmationCode(pendingEmail)
    } catch (error) {
      // Error is handled by context
    }
  }

  if (!isOpen) return null

  return (
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
        handleClose()
      }
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        border: '1px solid #1e293b',
        color: '#fff'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'confirm' && 'Verify Email'}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '1.5rem',
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
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#9ca3af'
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#fca5a5'
          }}>
            {error}
          </div>
        )}

        {mode === 'signin' && (
          <form onSubmit={handleSignIn}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#d1d5db' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#d1d5db' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                marginBottom: '20px'
              }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Need an account? Sign up
              </button>
            </div>
            <div style={{ textAlign: 'center', borderTop: '1px solid #374151', paddingTop: '20px' }}>
              <button
                type="button"
                onClick={signInWithOAuth}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                Sign In with Cognito
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#d1d5db' }}>
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#d1d5db' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#d1d5db' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              />
              <small style={{ color: '#9ca3af', fontSize: '12px' }}>
                Must be at least 8 characters with uppercase, lowercase, number, and symbol
              </small>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                marginBottom: '20px'
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setMode('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        )}

        {mode === 'confirm' && (
          <form onSubmit={handleConfirmSignUp}>
            <p style={{ marginBottom: '20px', color: '#d1d5db' }}>
              We sent a confirmation code to <strong>{pendingEmail}</strong>. 
              Please enter the code below to verify your email.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#d1d5db' }}>
                Confirmation Code
              </label>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                required
                placeholder="123456"
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  textAlign: 'center'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                marginBottom: '20px'
              }}
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#60a5fa',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline',
                  opacity: isLoading ? 0.6 : 1
                }}
              >
                Resend confirmation code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default AuthModal