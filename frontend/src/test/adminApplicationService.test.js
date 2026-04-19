import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase database connection
vi.mock('../firebase', () => ({ db: {} }))

/**
 * Mock all Firestore functions used by the admin application service.
 * This isolates the service logic from the real database.
 */
vi.mock('firebase/firestore', () => ({
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  collection: vi.fn((db, name) => ({ db, name })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn((db, collectionName, id) => ({ db, collectionName, id })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn((...args) => ({ type: 'query', args })),
  where: vi.fn((...args) => ({ type: 'where', args })),
  orderBy: vi.fn((...args) => ({ type: 'orderBy', args }))
}))

import AdminApplicationService from '../services/adminApplicationService'
import { addDoc, updateDoc, getDoc, getDocs } from 'firebase/firestore'

describe('AdminApplicationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  /**
   * Tests successful admin application submission.
   */
  it('submits admin application when no pending request exists', async () => {
    vi.spyOn(AdminApplicationService, 'getUserPendingApplication').mockResolvedValueOnce(null)
    addDoc.mockResolvedValueOnce({ id: 'admin-app-1' })

    const result = await AdminApplicationService.submitApplication(
      'u1',
      'test@example.com',
      'Test User',
      'student',
      'I can help manage the system'
    )

    expect(result).toBe('admin-app-1')
    expect(addDoc).toHaveBeenCalledTimes(1)
    expect(addDoc.mock.calls[0][1]).toMatchObject({
      userId: 'u1',
      userEmail: 'test@example.com',
      userName: 'Test User',
      currentRole: 'student',
      reason: 'I can help manage the system',
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null
    })
  })

  /**
   * Prevents duplicate pending admin applications.
   */
  it('throws if a pending admin application already exists', async () => {
    vi.spyOn(AdminApplicationService, 'getUserPendingApplication').mockResolvedValueOnce({ id: 'pending-1' })

    await expect(
      AdminApplicationService.submitApplication('u1', 'test@example.com', 'Test User', 'student', 'Reason')
    ).rejects.toThrow('You already have a pending application')
  })

  /**
   * Returns all pending admin applications.
   */
  it('returns pending admin applications', async () => {
    getDocs.mockResolvedValueOnce({
      forEach: (cb) => {
        cb({ id: '1', data: () => ({ status: 'pending' }) })
        cb({ id: '2', data: () => ({ status: 'pending' }) })
      }
    })

    const result = await AdminApplicationService.getPendingApplications()

    expect(result).toEqual([
      { id: '1', status: 'pending' },
      { id: '2', status: 'pending' }
    ])
  })

  /**
   * Returns all admin applications.
   */
  it('returns all admin applications', async () => {
    getDocs.mockResolvedValueOnce({
      forEach: (cb) => {
        cb({ id: '1', data: () => ({ status: 'approved' }) })
        cb({ id: '2', data: () => ({ status: 'rejected' }) })
      }
    })

    const result = await AdminApplicationService.getAllApplications()

    expect(result).toEqual([
      { id: '1', status: 'approved' },
      { id: '2', status: 'rejected' }
    ])
  })

  /**
   * Returns all admin applications for a specific user.
   */
  it('returns user admin applications', async () => {
    getDocs.mockResolvedValueOnce({
      forEach: (cb) => {
        cb({ id: '1', data: () => ({ userId: 'u1', status: 'pending' }) })
      }
    })

    const result = await AdminApplicationService.getUserApplications('u1')

    expect(result).toEqual([
      { id: '1', userId: 'u1', status: 'pending' }
    ])
  })

  /**
   * Returns null when no pending admin application exists.
   */
  it('returns null when no pending admin application exists', async () => {
    getDocs.mockResolvedValueOnce({ empty: true })

    const result = await AdminApplicationService.getUserPendingApplication('u1')

    expect(result).toBeNull()
  })

  /**
   * Returns the first pending admin application when one exists.
   */
  it('returns first pending admin application when found', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'admin-app-1',
          data: () => ({ userId: 'u1', status: 'pending' })
        }
      ]
    })

    const result = await AdminApplicationService.getUserPendingApplication('u1')

    expect(result).toEqual({
      id: 'admin-app-1',
      userId: 'u1',
      status: 'pending'
    })
  })

  /**
   * Approves an admin application and updates the user record.
   */
  it('approves admin application and updates user role/status', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ userId: 'u1' })
    })

    const result = await AdminApplicationService.approveApplication('app-1', 'reviewer-1', 'Approved')

    expect(result).toBe(true)
    expect(updateDoc).toHaveBeenCalledTimes(2)

    expect(updateDoc.mock.calls[0][1]).toMatchObject({
      status: 'approved',
      reviewedBy: 'reviewer-1',
      reviewNotes: 'Approved',
      updatedAt: 'MOCK_TIMESTAMP'
    })

    expect(updateDoc.mock.calls[1][1]).toMatchObject({
      role: 'admin',
      status: 'approved',
      updatedAt: 'MOCK_TIMESTAMP'
    })
  })

  /**
   * Throws when trying to approve a missing application.
   */
  it('throws when approving missing admin application', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => false
    })

    await expect(
      AdminApplicationService.approveApplication('missing', 'reviewer-1')
    ).rejects.toThrow('Application not found')
  })

  /**
   * Rejects an admin application.
   */
  it('rejects admin application', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true
    })

    const result = await AdminApplicationService.rejectApplication('app-1', 'reviewer-1', 'Rejected')

    expect(result).toBe(true)
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'rejected',
        reviewedBy: 'reviewer-1',
        reviewNotes: 'Rejected',
        updatedAt: 'MOCK_TIMESTAMP'
      })
    )
  })

  /**
   * Throws when trying to reject a missing application.
   */
  it('throws when rejecting missing admin application', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => false
    })

    await expect(
      AdminApplicationService.rejectApplication('missing', 'reviewer-1', 'Rejected')
    ).rejects.toThrow('Application not found')
  })

  /**
   * Returns correct admin application statistics.
   */
  it('calculates admin application statistics correctly', async () => {
    vi.spyOn(AdminApplicationService, 'getAllApplications').mockResolvedValueOnce([
      { status: 'pending' },
      { status: 'pending' },
      { status: 'approved' },
      { status: 'rejected' }
    ])

    const stats = await AdminApplicationService.getApplicationStats()

    expect(stats).toEqual({
      total: 4,
      pending: 2,
      approved: 1,
      rejected: 1
    })
  })
})