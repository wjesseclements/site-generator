import { Amplify } from 'aws-amplify'
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  confirmSignUp,
  resendSignUpCode,
  signInWithRedirect,
  type SignUpInput,
  type SignInInput,
  type ConfirmSignUpInput
} from 'aws-amplify/auth'

// Configure Amplify with our Cognito settings
const authConfig = {
  Cognito: {
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
    userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
    identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID!,
    loginWith: {
      oauth: {
        domain: `site-generator-dev-050752625591.auth.us-east-1.amazoncognito.com`,
        scopes: ['email', 'openid', 'profile'],
        redirectSignIn: [
          'http://localhost:3000',
          'https://d2ja9zm7l49dwi.cloudfront.net'
        ],
        redirectSignOut: [
          'http://localhost:3000',
          'https://d2ja9zm7l49dwi.cloudfront.net'
        ],
        responseType: 'code' as const
      }
    }
  }
}

// Initialize Amplify (with client-side check for static exports)
if (typeof window !== 'undefined') {
  Amplify.configure({ Auth: authConfig })
}

export interface User {
  userId: string
  email: string
  name?: string
  emailVerified: boolean
}

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  error: string | null
}

// Authentication service class
export class AuthService {
  static async getCurrentUser(): Promise<User | null> {
    // During static build, return null to prevent errors
    if (typeof window === 'undefined') {
      return null
    }
    
    try {
      const user = await getCurrentUser()
      const session = await fetchAuthSession()
      
      if (!user || !session.tokens) {
        return null
      }

      return {
        userId: user.userId,
        email: user.signInDetails?.loginId || '',
        name: user.signInDetails?.loginId,
        emailVerified: true
      }
    } catch (error) {
      console.log('No authenticated user found')
      return null
    }
  }

  static async getAuthHeaders(): Promise<Record<string, string>> {
    // During static build, return empty headers to prevent errors
    if (typeof window === 'undefined') {
      return { 'Content-Type': 'application/json' }
    }
    
    try {
      const session = await fetchAuthSession()
      
      if (!session.tokens?.idToken) {
        throw new Error('No valid authentication token')
      }

      return {
        'Authorization': `Bearer ${session.tokens.idToken.toString()}`,
        'Content-Type': 'application/json'
      }
    } catch (error) {
      console.error('Failed to get auth headers:', error)
      throw new Error('Authentication required')
    }
  }

  static async signUp(input: SignUpInput): Promise<void> {
    try {
      const result = await signUp(input)
      
      if (result.nextStep?.signUpStep === 'CONFIRM_SIGN_UP') {
        console.log('Sign up successful, confirmation required')
      }
    } catch (error) {
      console.error('Sign up failed:', error)
      throw error
    }
  }

  static async confirmSignUp(input: ConfirmSignUpInput): Promise<void> {
    try {
      await confirmSignUp(input)
      console.log('Sign up confirmed successfully')
    } catch (error) {
      console.error('Sign up confirmation failed:', error)
      throw error
    }
  }

  static async signIn(input: SignInInput): Promise<User> {
    try {
      const result = await signIn(input)
      
      if (result.isSignedIn) {
        const user = await this.getCurrentUser()
        if (!user) {
          throw new Error('Failed to get user details after sign in')
        }
        return user
      }
      
      throw new Error('Sign in incomplete')
    } catch (error) {
      console.error('Sign in failed:', error)
      throw error
    }
  }

  static async signInWithOAuth(): Promise<void> {
    try {
      await signInWithRedirect({
        provider: { custom: 'Cognito' }
      })
    } catch (error) {
      console.error('OAuth sign in failed:', error)
      throw error
    }
  }

  static async signOut(): Promise<void> {
    try {
      await signOut()
      console.log('Sign out successful')
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    }
  }

  static async resendConfirmationCode(username: string): Promise<void> {
    try {
      await resendSignUpCode({ username })
      console.log('Confirmation code resent')
    } catch (error) {
      console.error('Failed to resend confirmation code:', error)
      throw error
    }
  }
}

// API helper with authentication
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const authHeaders = await AuthService.getAuthHeaders()
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers
      }
    })

    if (response.status === 401) {
      throw new Error('Authentication expired. Please sign in again.')
    }

    return response
  } catch (error) {
    console.error('Authenticated request failed:', error)
    throw error
  }
}

export default AuthService