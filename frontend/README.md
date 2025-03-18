# ESG Reporting Platform

A modern web application for managing Environmental, Social, and Governance (ESG) reporting and compliance.

## Features

- **Authentication System**: Secure user authentication with email/password and social login options
- **Dashboard**: Overview of ESG metrics and performance indicators
- **Document Management**: Upload, organize, and manage ESG documents and reports
- **AI Assistant**: Chat-based AI assistant to help with ESG reporting questions
- **Analytics**: Visualize and track ESG metrics over time
- **Profile Management**: User profile management with data privacy controls

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **UI**: Tailwind CSS with shadcn/ui components
- **Authentication**: Supabase Auth
- **State Management**: React Context API and Zustand
- **Styling**: Tailwind CSS

## Project Structure

The project follows the Next.js App Router structure:

```
frontend/
├── src/
│   ├── app/                  # App Router pages and layouts
│   │   ├── analytics/        # Analytics route
│   │   ├── chat/             # AI Assistant route  
│   │   ├── dashboard/        # Dashboard route
│   │   ├── documents/        # Document management route
│   │   ├── profile/          # User profile route
│   │   ├── upload/           # File upload route
│   │   └── page.tsx          # Landing page
│   ├── components/           # Reusable UI components
│   │   ├── auth/             # Authentication components
│   │   ├── navigation/       # Navigation components
│   │   └── ui/               # UI components
│   ├── hooks/                # Custom React hooks
│   │   └── use-auth.tsx      # Authentication hook
│   ├── lib/                  # Utility functions and types
│   │   ├── store/            # Zustand state management
│   │   └── types/            # TypeScript type definitions
│   └── pages/                # Legacy page components (used in app router)
└── tests/                    # Test files
```

## Authentication System

The authentication system is built with Supabase Auth and includes:

1. **Authentication Provider**: The `AuthProvider` in `src/hooks/use-auth.tsx` provides authentication context to the entire application.
2. **Authentication Hook**: The `useAuth` hook in `src/hooks/use-auth.tsx` provides:
   - User authentication state
   - Sign-in/sign-up methods
   - Social login
   - Sign-out functionality
   - Password reset

3. **Protected Routes**: Each authenticated route uses a layout component that includes authentication checks to ensure only authenticated users can access the page.

Example usage:

```tsx
import { useAuth } from '@/hooks/use-auth'

function MyComponent() {
  const { isAuthenticated, user, signOut } = useAuth()
  
  if (!isAuthenticated) {
    return <div>Please sign in</div>
  }
  
  return (
    <div>
      <p>Welcome, {user.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

## Protected Routes

Protected routes check user authentication status and redirect to the login page if the user is not authenticated:

```tsx
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function ProtectedLayout({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])
  
  if (isLoading) {
    return <LoadingSpinner />
  }
  
  if (!isAuthenticated) {
    return null
  }
  
  return <>{children}</>
}
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/esg-reporting.git
cd esg-reporting
```

2. Install dependencies:
```bash
cd frontend
npm install
# or
yarn install
```

3. Set up environment variables:
Create a `.env.local` file in the frontend directory with the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open your browser and navigate to http://localhost:3000

## License

This project is licensed under the MIT License - see the LICENSE file for details.
