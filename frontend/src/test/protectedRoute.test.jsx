import React from 'react'
import { describe, it, expect, vi } from 'vitest'

/**
 * Mock authentication hook
 */
const mockUseAuth = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}))

import ProtectedRoute from '../components/protectedRoute'

describe('ProtectedRoute', () => {

  /**
   * Tests loading state
   */
  it('shows loading while auth is loading', () => {
    mockUseAuth.mockReturnValue({ loading: true })

    const element = ProtectedRoute({ children: "Secret", allowedRoles: ["admin"] })

    expect(element.props.children).toBe("Loading...")
  })

  /**
   * Tests unauthenticated user redirect
   */
  it('redirects to login if no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })

    const element = ProtectedRoute({ children: "Secret", allowedRoles: ["admin"] })

    expect(element.props.to).toBe("/login")
  })

  /**
   * Tests role restriction
   */
  it('blocks incorrect role', () => {
    mockUseAuth.mockReturnValue({ user: {}, role: "student", loading: false })

    const element = ProtectedRoute({ children: "Secret", allowedRoles: ["admin"] })

    expect(element.props.to).toBe("/unauthorized")
  })

  /**
   * Tests approved access
   */
  it('allows approved admin', () => {
    mockUseAuth.mockReturnValue({ user: {}, role: "admin", status: "approved", loading: false })

    const element = ProtectedRoute({ children: "Dashboard", allowedRoles: ["admin"] })

    expect(element).toBe("Dashboard")
  })
})