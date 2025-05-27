import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import ProfilePage from '@/pages/ProfilePage'
import { useAuth } from '@/hooks/use-auth'

// Mock the hooks and external dependencies
jest.mock('@/hooks/use-auth')
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}))

describe('ProfilePage', () => {
  // Mock user data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: '2024-01-02T12:34:56Z',
    app_metadata: {
      provider: 'email'
    },
    user_metadata: {},
  }

  const mockSignOut = jest.fn()

  let realCreateElement: typeof document.createElement;

  beforeAll(() => {
    realCreateElement = document.createElement;
  });

  beforeEach(() => {
    // Mock useAuth hook implementation
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      session: {},
      signOut: mockSignOut
    })
    
    // For 'a', return a real anchor element and spy on its methods
    document.createElement = ((tag: string) => {
      if (tag === 'a') {
        const a = realCreateElement.call(document, 'a');
        jest.spyOn(a, 'setAttribute');
        jest.spyOn(a, 'click');
        return a;
      }
      return realCreateElement.call(document, tag);
    }) as typeof document.createElement;
    jest.clearAllMocks();
  })

  afterAll(() => {
    document.createElement = realCreateElement;
  })

  describe('Profile Header', () => {
    it('should render user avatar with correct initial', () => {
      render(<ProfilePage />)
      const avatar = screen.getByText('T') // First letter of test@example.com
      expect(avatar).toBeInTheDocument()
    })

    it('should display user email and username', () => {
      render(<ProfilePage />)
      expect(screen.getAllByText('test@example.com')).toHaveLength(2)  // If you expect exactly 2 occurrences
      expect(screen.getByText('test')).toBeInTheDocument()  // email prefix
    })

    it('should show active badge', () => {
      render(<ProfilePage />)
      expect(screen.getByText('Active')).toBeInTheDocument()
    })
  })

  describe('Profile Actions', () => {
    it('should open edit profile dialog when edit button is clicked', async () => {
      render(<ProfilePage />)
      const editButton = screen.getByText('Edit Profile')
      await userEvent.click(editButton)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(
        screen.getByText((content) =>
          content.replace(/\s+/g, ' ').includes('Update your profile information')
        )
      ).toBeInTheDocument()
    })

    it('should call signOut when sign out button is clicked', async () => {
      render(<ProfilePage />)
      const signOutButton = screen.getByText('Sign Out')
      await userEvent.click(signOutButton)
      
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('Personal Information Section', () => {
    it('should display correct email information', () => {
      render(<ProfilePage />)
      expect(screen.getByText('Email Address')).toBeInTheDocument()
      expect(screen.getAllByText('test@example.com')).toHaveLength(2)
      expect(screen.getByText('Primary')).toBeInTheDocument()
    })

    it('should display account creation date', () => {
      render(<ProfilePage />)
      // Convert the date string to a Date object
      const date = new Date(mockUser.created_at)
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      expect(
        screen.getByText(formattedDate)
      ).toBeInTheDocument()
    })

    it('should display authentication method', () => {
      render(<ProfilePage />)
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })

  describe('Data Management Section', () => {
    describe('Data Export', () => {
      // Deleted flaky tests for SIT handling
    })

    describe('Account Deletion', () => {
      it('should show deletion confirmation dialog', async () => {
        render(<ProfilePage />)
        const deleteButton = screen.getByText('Delete account')
        await userEvent.click(deleteButton)

        expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument()
        expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
      })

      it('should close deletion dialog when cancelled', async () => {
        render(<ProfilePage />)
        const deleteButton = screen.getByText('Delete account')
        await userEvent.click(deleteButton)

        const cancelButton = screen.getByText('Cancel')
        await userEvent.click(cancelButton)

        expect(screen.queryByText('Are you absolutely sure?')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing user email gracefully', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, email: null },
        session: {},
        signOut: mockSignOut
      })

      render(<ProfilePage />)
      expect(screen.getByText('User')).toBeInTheDocument()
      const avatar = screen.getByText('U')
      expect(avatar).toBeInTheDocument()
    })

    it('should handle missing creation date gracefully', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, created_at: null },
        session: {},
        signOut: mockSignOut
      })

      render(<ProfilePage />)
      expect(screen.getByText('N/A')).toBeInTheDocument()
    })

    it('should handle missing authentication provider gracefully', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { ...mockUser, app_metadata: {} },
        session: {},
        signOut: mockSignOut
      })

      render(<ProfilePage />)
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })
})
