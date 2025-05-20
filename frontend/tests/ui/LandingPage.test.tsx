import { render, screen, within } from '@testing-library/react';
import LandingPage from '@/app/page';

describe('LandingPage is rendered', () => {
  it('renders the hero headline', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('heading', { name: /Revolutionize Your ESG Reporting/i })
    ).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<LandingPage />);
    const header = screen.getByRole('banner');
    expect(within(header).getByText(/Features/i)).toBeInTheDocument();
    expect(within(header).getByText(/About/i)).toBeInTheDocument();
    expect(within(header).getByText(/Contact/i)).toBeInTheDocument();
  });

  it('renders the Get Started button linking to signup', () => {
    render(<LandingPage />);
    const getStartedLinks = screen.getAllByRole('link', { name: /Get Started/i });
    const signupLink = getStartedLinks.find(link => link.getAttribute('href') === '/auth/signup');
    expect(signupLink).toBeInTheDocument();
  });

  it('renders the Login button', () => {
    render(<LandingPage />);
    expect(screen.getByRole('link', { name: /Login/i })).toBeInTheDocument();
  });

  it('renders the features section', () => {
    render(<LandingPage />);
    expect(
      screen.getByRole('heading', { name: /Enterprise-Grade Features/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/AI-Powered Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/Document Processing/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Interactive Dashboards/i).length).toBeGreaterThan(0);
  });

  it('renders the footer', () => {
    render(<LandingPage />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getAllByText(/ESG Metrics/i).length).toBeGreaterThan(0);
    expect(within(footer).getByText(/All rights reserved/i)).toBeInTheDocument();
  });

  it('navigation links have correct hrefs', () => {
    render(<LandingPage />);
    const header = screen.getByRole('banner');
    const featuresLink = within(header).getByRole('link', { name: /Features/i });
    const aboutLink = within(header).getByRole('link', { name: /About/i });
    const contactLink = within(header).getByRole('link', { name: /Contact/i });
    expect(featuresLink).toHaveAttribute('href', '#features');
    expect(aboutLink).toHaveAttribute('href', '#platform-overview');
    expect(contactLink).toHaveAttribute('href', '#contact');
  });

  it('navigates to /auth/login when Login is clicked', () => {
    render(<LandingPage />);
    const loginLink = screen.getByRole('link', { name: /Login/i });
    expect(loginLink).toHaveAttribute('href', '/auth/login');
    // Simulate click and check navigation (JSDOM does not perform real navigation)
    // Optionally, you can fireEvent.click(loginLink) and check window.location if you want to mock it
  });
});
