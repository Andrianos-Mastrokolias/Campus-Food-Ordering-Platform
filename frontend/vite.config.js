import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite configuration for the frontend project.
 * Includes Vitest setup for running tests and generating coverage reports.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom', // Simulates browser environment for React components
    globals: true, // Allows use of global test functions like describe, it, expect
    coverage: {
      provider: 'v8', // Uses V8 engine for faster coverage
      reporter: ['text', 'lcov', 'html'], // Outputs coverage in multiple formats
      reportsDirectory: './coverage',

      /**
       * Only track coverage for the files you worked on.
       * This ensures your coverage percentage reflects your contribution.
       */
      include: [
        'src/services/vendorApplicationService.js',
        'src/services/adminApplicationService.js',
        'src/components/protectedRoute.jsx'
      ],

      /**
       * Minimum coverage thresholds required.
       * If below 50%, tests will fail.
       */
      thresholds: {
        lines: 50,
        functions: 50,
        statements: 50
      }
    }
  }
})