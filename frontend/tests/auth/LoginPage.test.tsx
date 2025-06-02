process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import LoginPage from '@/app/auth/login/page';
import { AuthProvider } from '@/hooks/use-auth';

// Mock the direct import path used by use-auth.tsx
vi.mock('@/lib/supabase/client', () => {
  console.log('>>> VI.MOCK for @/lib/supabase/client EXECUTED <<<');
  const mockAuth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn((_event: any, callback: any) => {
      console.log('>>> MOCKED onAuthStateChange CALLED <<<');
      // Simulate a default state (e.g., no session)
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }), // Default mock for getSession
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }), // Default mock for getUser
    // Add any other specific auth methods your component directly calls
  };

  return {
    __esModule: true, // Important for modules with default exports
    default: { // Assuming your client.ts exports a default object
      auth: mockAuth,
      // Mock other Supabase features if client.ts exports them and use-auth.tsx uses them
      // e.g., from: vi.fn().mockReturnThis(), select: vi.fn(),
    }
  };
});

// This mock might still be needed if other components use it directly,
// or if @/lib/supabase/client re-exports from it in a way that isn't caught.
// For now, let's keep it to be safe, but prioritize the more specific mock above.
vi.mock('@supabase/supabase-js', () => {
  console.log('>>> VI.MOCK for @supabase/supabase-js EXECUTED (fallback) <<<');
  const originalModule = async () => await vi.importActual('@supabase/supabase-js');
  const actual = originalModule(); // Eagerly call to resolve the promise

  const mockAuthForBase = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(), 
    signOut: vi.fn(),
    onAuthStateChange: vi.fn((_event: any, callback: any) => {
        console.log('>>> FALLBACK MOCKED onAuthStateChange CALLED <<<');
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  };
  
  return {
    ...(actual as any), // Spread actual module exports
    createClient: vi.fn().mockImplementation((url, key) => {
      console.log('>>> FALLBACK MOCKED createClient CALLED with:', url, key);
      return {
        auth: mockAuthForBase,
        // from: vi.fn().mockReturnThis(),
        // select: vi.fn(),
        // channel: vi.fn().mockReturnValue({ on: vi.fn(), subscribe: vi.fn() }),
      };
    }),
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
}));

describe('LoginPage', () => {
  const AllProviders = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  test('renders the main heading and subheading', () => {
    render(<LoginPage />, { wrapper: AllProviders });
    expect(screen.getByRole('heading', { name: /Sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByText(/Enter your credentials to access your ESG dashboard/i)).toBeInTheDocument();
  });

  test('renders the branding/logo in desktop and mobile', () => {
    render(<LoginPage />, { wrapper: AllProviders });
    // Desktop branding
    expect(screen.getAllByText(/ESG Metrics/i).length).toBeGreaterThan(0);
  });

  test('renders the Sign up link with correct href', () => {
    render(<LoginPage />, { wrapper: AllProviders });
    const signupLink = screen.getByRole('link', { name: /Sign up/i });
    expect(signupLink).toHaveAttribute('href', '/auth/signup');
  });

  test('renders the Back to home link with correct href', () => {
    render(<LoginPage />, { wrapper: AllProviders });
    const backLink = screen.getByRole('link', { name: /Back to home/i });
    expect(backLink).toHaveAttribute('href', '/');
  });

  test('renders the LoginForm component', () => {
    render(<LoginPage />, { wrapper: AllProviders });
    // Check for a field or button that should be in LoginForm
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/password/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
