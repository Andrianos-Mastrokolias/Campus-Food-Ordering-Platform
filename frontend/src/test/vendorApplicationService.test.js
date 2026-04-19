import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Firebase database connection
vi.mock('../firebase.jsx', () => ({ db: {} }))

/**
 * Mock all Firestore functions used by the vendor application service.
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

import VendorApplicationService from '../services/vendorApplicationService'
import { addDoc, updateDoc, getDoc, getDocs } from 'firebase/firestore'

describe('VendorApplicationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  /**
   * Tests shop number generation.
   */
  it('generates a shop number with cleaned ids', () => {
    const shopNumber = VendorApplicationService.generateShopNumber('ab-c_123!', 'u@1#2')
    expect(shopNumber).toMatch(/^SHOP-\d{8}-U12-ABC123$/)
  })

  /**
   * Tests vendor profile object creation.
   */
  it('builds vendor profile correctly', () => {
    const profile = VendorApplicationService.buildVendorProfile(
      {
        businessName: 'Campus Cafe',
        businessDescription: 'Coffee and snacks',
        businessPhone: '1234567890',
        businessAddress: 'Student Centre',
        businessType: 'Cafe'
      },
      'SHOP-20260101-USER-APP'
    )

    expect(profile).toEqual({
      businessName: 'Campus Cafe',
      businessDescription: 'Coffee and snacks',
      businessPhone: '1234567890',
      businessAddress: 'Student Centre',
      businessType: 'Cafe',
      shopNumber: 'SHOP-20260101-USER-APP',
      verifiedAt: 'MOCK_TIMESTAMP'
    })
  })

  /**
   * Tests successful vendor application submission.
   */
  it('submits application when no pending application exists', async () => {
    vi.spyOn(VendorApplicationService, 'getUserPendingApplication').mockResolvedValueOnce(null)
    addDoc.mockResolvedValueOnce({ id: 'app-123' })

    const result = await VendorApplicationService.submitApplication('u1', 'a@b.com', 'User', {
      businessName: 'Cafe',
      businessDescription: 'Desc',
      businessPhone: '123',
      businessAddress: 'Campus',
      businessType: 'Food'
    })

    expect(result).toBe('app-123')
    expect(addDoc).toHaveBeenCalledTimes(1)
  })

  /**
   * Prevents duplicate pending vendor submissions.
   */
  it('prevents duplicate pending applications', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(VendorApplicationService, 'getUserPendingApplication').mockResolvedValueOnce({ id: 'pending' })

    await expect(
      VendorApplicationService.submitApplication('u1', 'a@b.com', 'User', {})
    ).rejects.toThrow('You already have a pending vendor application')

    errorSpy.mockRestore()
  })

  /**
   * Returns pending vendor applications.
   */
  it('returns pending applications', async () => {
    getDocs.mockResolvedValueOnce({
      forEach: (cb) => {
        cb({ id: '1', data: () => ({ status: 'pending' }) })
        cb({ id: '2', data: () => ({ status: 'pending' }) })
      }
    })

    const result = await VendorApplicationService.getPendingApplications()

    expect(result).toEqual([
      { id: '1', status: 'pending' },
      { id: '2', status: 'pending' }
    ])
  })

  /**
   * Returns all vendor applications.
   */
  it('returns all applications', async () => {
    getDocs.mockResolvedValueOnce({
      forEach: (cb) => {
        cb({ id: '1', data: () => ({ status: 'approved' }) })
      }
    })

    const result = await VendorApplicationService.getAllApplications()

    expect(result).toEqual([
      { id: '1', status: 'approved' }
    ])
  })

  /**
   * Returns vendor applications for a specific user.
   */
  it('returns user applications', async () => {
    getDocs.mockResolvedValueOnce({
      forEach: (cb) => {
        cb({ id: '1', data: () => ({ userId: 'u1' }) })
      }
    })

    const result = await VendorApplicationService.getUserApplications('u1')

    expect(result).toEqual([
      { id: '1', userId: 'u1' }
    ])
  })

  /**
   * Returns null when no pending application exists for a user.
   */
  it('returns null when no pending vendor application exists', async () => {
    getDocs.mockResolvedValueOnce({ empty: true })

    const result = await VendorApplicationService.getUserPendingApplication('u1')

    expect(result).toBeNull()
  })

  /**
   * Returns the first pending application when one exists.
   */
  it('returns first pending vendor application when found', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'app-1',
          data: () => ({ status: 'pending', userId: 'u1' })
        }
      ]
    })

    const result = await VendorApplicationService.getUserPendingApplication('u1')

    expect(result).toEqual({
      id: 'app-1',
      status: 'pending',
      userId: 'u1'
    })
  })

  /**
   * Approves a vendor application and updates both application and user records.
   */
  it('approves application and updates both application and user', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        userId: 'user-1234',
        businessName: 'Cafe',
        businessDescription: 'Desc',
        businessPhone: '123',
        businessAddress: 'Campus',
        businessType: 'Food',
        shopNumber: null
      })
    })

    const result = await VendorApplicationService.approveApplication('app-123456', 'admin-1', 'Looks good')

    expect(result).toMatch(/^SHOP-/)
    expect(updateDoc).toHaveBeenCalledTimes(2)
  })

  /**
   * Throws when trying to approve a missing vendor application.
   */
  it('throws when approving missing application', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => false
    })

    await expect(
      VendorApplicationService.approveApplication('missing', 'admin-1')
    ).rejects.toThrow('Application not found')
  })

  /**
   * Rejects a vendor application.
   */
  it('rejects application', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true
    })

    const result = await VendorApplicationService.rejectApplication('app-1', 'admin-1', 'Missing docs')

    expect(result).toBe(true)
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'rejected',
        reviewedBy: 'admin-1',
        reviewNotes: 'Missing docs',
        updatedAt: 'MOCK_TIMESTAMP'
      })
    )
  })

  /**
   * Throws when trying to reject a missing vendor application.
   */
  it('throws when rejecting missing application', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => false
    })

    await expect(
      VendorApplicationService.rejectApplication('missing', 'admin-1', 'Missing docs')
    ).rejects.toThrow('Application not found')
  })

  /**
   * Returns correct vendor application statistics.
   */
  it('calculates vendor application statistics correctly', async () => {
    vi.spyOn(VendorApplicationService, 'getAllApplications').mockResolvedValueOnce([
      { status: 'pending' },
      { status: 'approved' },
      { status: 'approved' },
      { status: 'rejected' }
    ])

    const stats = await VendorApplicationService.getApplicationStats()

    expect(stats).toEqual({
      total: 4,
      pending: 1,
      approved: 2,
      rejected: 1
    })
  })
})