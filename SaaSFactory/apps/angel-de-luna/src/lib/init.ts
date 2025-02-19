import { validateEnv } from '@/utils/env'

// Run environment validation
try {
  validateEnv()
} catch (error) {
  console.error('Environment validation failed:', error)
  process.exit(1)
} 