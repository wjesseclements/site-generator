'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthService, type User, type AuthState } from '@/lib/auth'

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signOut: () => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  signInWithOAuth: () => Promise<void>
  resendConfirmationCode: (email: string) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null
  })

  const updateAuthState = (updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }))
  }

  const clearError = () => {
    updateAuthState({ error: null })
  }

  const checkAuthState = async () => {
    try {
      updateAuthState({ isLoading: true, error: null })
      
      const user = await AuthService.getCurrentUser()
      
      updateAuthState({
        isAuthenticated: !!user,
        user,
        isLoading: false
      })
    } catch (error) {
      console.error('Auth check failed:', error)
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication check failed'
      })
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      updateAuthState({ isLoading: true, error: null })
      
      const user = await AuthService.signIn({
        username: email,
        password
      })
      
      updateAuthState({
        isAuthenticated: true,
        user,
        isLoading: false
      })
    } catch (error) {
      updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed'
      })
      throw error
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      updateAuthState({ isLoading: true, error: null })
      
      await AuthService.signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name
          }
        }
      })
      
      updateAuthState({ isLoading: false })
    } catch (error) {
      updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign up failed'
      })
      throw error
    }
  }

  const confirmSignUp = async (email: string, code: string) => {
    try {
      updateAuthState({ isLoading: true, error: null })
      
      await AuthService.confirmSignUp({
        username: email,
        confirmationCode: code
      })
      
      updateAuthState({ isLoading: false })
    } catch (error) {
      updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Confirmation failed'
      })
      throw error
    }
  }

  const signInWithOAuth = async () => {
    try {
      updateAuthState({ isLoading: true, error: null })
      await AuthService.signInWithOAuth()
    } catch (error) {
      updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'OAuth sign in failed'
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      updateAuthState({ isLoading: true, error: null })
      
      await AuthService.signOut()
      
      updateAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false
      })
    } catch (error) {
      updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      })
    }
  }

  const resendConfirmationCode = async (email: string) => {
    try {
      updateAuthState({ isLoading: true, error: null })
      
      await AuthService.resendConfirmationCode(email)
      
      updateAuthState({ isLoading: false })
    } catch (error) {
      updateAuthState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to resend confirmation code'
      })
      throw error
    }
  }

  useEffect(() => {
    checkAuthState()

    // TODO: Add auth event listeners when Hub import issue is resolved
    // For now, we'll rely on manual state checks
  }, [])

  const contextValue: AuthContextType = {
    ...authState,
    signIn,
    signUp,
    signOut,
    confirmSignUp,
    signInWithOAuth,
    resendConfirmationCode,
    clearError
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext