process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';

import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/auth/login/page';
import { AuthProvider } from '@/hooks/use-auth';

// Bare-minimum mock for @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => {
  console.log('>>> JEST.MOCK for @supabase/supabase-js EXECUTED <<<'); // Diagnostic log
  const mockAuth = {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(), // Added for completeness, common in auth flows
    signOut: jest.fn(),
    onAuthStateChange: jest.fn((_event, callback) => {
      // Simulate a default state (e.g., no session)
      // You can call `callback(null, null)` or specific mock session if needed for initial state tests
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      };
    }),
    getSession: jest.fn(),
    getUser: jest.fn(),
    // Add any other specific auth methods your component directly calls
  };

  return {
    createClient: jest.fn().mockImplementation((url, key) => {
      console.log('>>> MOCKED createClient CALLED with:', url, key); // Diagnostic log
      return {
        auth: mockAuth,
        // If your components directly use other Supabase features like .from() or .channel(),
        // you might need to add minimal mocks for them here too, e.g.:
        // from: jest.fn().mockReturnThis(), // To allow chaining like .from().select()
        // select: jest.fn(),
        // channel: jest.fn().mockReturnValue({ on: jest.fn(), subscribe: jest.fn() }),
      };
    }),
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
}));

describe('LoginPage', () => {
  const AllProviders = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  it('renders the main heading and subheading', () => {
    render(<LoginPage />, { wrapper: AllProviders });
    expect(screen.getByRole('heading', { name: /Sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByText(/Enter your credentials to access your ESG dashboard/i)).toBeInTheDocument();
  });

  it('renders the branding/logo in desktop and mobile', () => {
    render(<LoginPage />, { wrapper: AllProviders });
    // Desktop branding
    expect(screen.getAllByText(/ESG Metrics/i).length).toBeGreaterThan(0);
  });

  it('renders the Sign up link with correct href', () => {
    render(<LoginPage />, { wrapper: AllProviders });
    const signupLink = screen.getByRole('link', { name: /Sign up/i });
    expect(signupLink).toHaveAttribute('href', '/auth/signup');
  });

  it('renders the Back to home link with correct href', () => {
    render(<LoginPage />, { wrapper: AllProviders });
    const backLink = screen.getByRole('link', { name: /Back to home/i });
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('renders the LoginForm component', () => {
    render(<LoginPage />, { wrapper: AllProviders });
    // Check for a field or button that should be in LoginForm
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/password/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});
