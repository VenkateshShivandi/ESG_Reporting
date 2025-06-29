// frontend/vitest.setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

// Mock matchMedia
global.matchMedia =
  global.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    }
  }

// Mock crypto.randomUUID if not available in JSDOM
if (typeof global.crypto === 'undefined') {
  ;(global as any).crypto = {
    randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(2, 15),
  }
} else if (typeof global.crypto.randomUUID === 'undefined') {
  global.crypto.randomUUID = (() =>
    'mock-uuid-' + Math.random().toString(36).substring(2, 15)) as any
}

// Mock window.URL.createObjectURL and window.URL.revokeObjectURL
global.URL.createObjectURL = vi.fn()
global.URL.revokeObjectURL = vi.fn()

// Silence console.error and console.warn calls originating from specific known issues
// that are not critical to test outcomes and clutter test output.
const originalError = console.error
console.error = (...args: any[]) => {
  const firstArg = args[0]
  if (
    typeof firstArg === 'string' &&
    (firstArg.includes('Not implemented: navigation') ||
      firstArg.includes('Warning: validateDOMNesting(...)') ||
      (firstArg.includes('An update to') &&
        firstArg.includes('inside a test was not wrapped in act')))
  ) {
    return
  }
  originalError(...args)
}

const originalWarn = console.warn
console.warn = (...args: any[]) => {
  const firstArg = args[0]
  if (
    typeof firstArg === 'string' &&
    (firstArg.includes('unknown prop `placeholder` on <menu> tag') ||
      firstArg.includes('RadixPrimitive') ||
      (firstArg.includes('An update to') &&
        firstArg.includes('inside a test was not wrapped in act')) ||
      firstArg.includes('Received `true` for a non-boolean attribute') ||
      (firstArg.includes('React does not recognize the') &&
        firstArg.includes('prop on a DOM element')))
  ) {
    return
  }
  originalWarn(...args)
}

// Mock supabase to prevent actual API calls during tests
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn().mockResolvedValue({ user: { id: '123' } }),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      single: vi.fn(),
    })),
  },
  __esModule: true,
  default: {
    auth: {
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn().mockResolvedValue({ user: { id: '123' } }),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      single: vi.fn(),
    })),
  },
}))

// Mock react-pdf
vi.mock('react-pdf', () => ({
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: '',
    },
  },
  Document: ({ onLoadSuccess, children }: any) => {
    React.useEffect(() => {
      if (onLoadSuccess) {
        onLoadSuccess({ numPages: 1 })
      }
    }, [onLoadSuccess])
    return children
  },
  Page: ({ children }: any) => children, // Render children directly, or a placeholder
}))

// Mock framer-motion to prevent animation-related act() warnings
vi.mock('framer-motion', () => {
  const MockMotion = (Component: any) => {
    return React.forwardRef((props: any, ref: any) => {
      return React.createElement(Component, { ...props, ref })
    })
  }

  MockMotion.div = (props: any) => React.createElement('div', props)
  MockMotion.table = (props: any) => React.createElement('table', props)
  MockMotion.tr = (props: any) => React.createElement('tr', props)

  return {
    motion: MockMotion,
    AnimatePresence: (props: any) => React.createElement(React.Fragment, null, props.children),
  }
})
