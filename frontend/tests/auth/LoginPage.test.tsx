process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test_anon_key';

import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/auth/login/page';
import { AuthProvider } from '@/hooks/use-auth';

jest.mock('@/lib/supabase', () => ({
  // Provide a mock implementation
  createClient: jest.fn(() => ({
    auth: { signInWithPassword: jest.fn() },
    // ...other methods you use
  })),
}));

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
