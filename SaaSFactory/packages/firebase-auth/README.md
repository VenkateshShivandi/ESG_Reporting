# @theamiteshtripathi/firebase-auth

A React-based Firebase Authentication provider with TypeScript support, offering comprehensive authentication functionality.

## Features

- Firebase Authentication integration
- React Context API implementation
- TypeScript support
- Complete authentication flow
- Error handling
- Loading states
- Email/Password authentication
- Password reset functionality
- Email/Password update capabilities
- ESM and CommonJS support

## Installation
bash
npm install @theamiteshtripathi/firebase-auth


## Dependencies

- firebase: ^10.12.5 (peer dependency)
- react: ^18.2.0 (peer dependency)

## Configuration

The package requires Firebase configuration:

typescript
interface FirebaseConfig {
apiKey: string;
authDomain: string;
projectId: string;
storageBucket: string;
messagingSenderId: string;
appId: string;
}


## Usage

### Initialize Firebase Auth Provider

typescript
import { AuthProvider } from '@theamiteshtripathi/firebase-auth';
function App() {
return (
<AuthProvider>
{/ Your app components /}
</AuthProvider>
);
}


### Using the Auth Hook
typescript
import { useAuth } from '@theamiteshtripathi/firebase-auth';
function LoginComponent() {
const {
user,
loading,
error,
signIn,
signUp,
signOut,
resetPassword,
updateEmail,
updatePassword
} = useAuth();
const handleLogin = async (email: string, password: string) => {
try {
await signIn(email, password);
} catch (error) {
console.error('Login failed:', error);
}
};
}


## API Reference

### Auth Context Type
typescript
interface AuthContextType {
user: User | null;
loading: boolean;
error: Error | null;
signIn: (email: string, password: string) => Promise<void>;
signUp: (email: string, password: string) => Promise<void>;
signOut: () => Promise<void>;
resetPassword: (email: string) => Promise<void>;
updateEmail: (email: string) => Promise<void>;
updatePassword: (password: string) => Promise<void>;
}


### Auth Error Handling
typescript
class AuthError extends Error {
constructor(message: string, public originalError: any) {
super(message);
this.name = 'AuthError';
}
}


## Features in Detail

### Authentication State Management
typescript
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);
useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, (user) => {
setUser(user);
setLoading(false);
});
return unsubscribe;
}, [auth]);


### Authentication Methods

#### Sign In
typescript
const signIn = async (email: string, password: string) => {
try {
await signInWithEmailAndPassword(auth, email, password);
} catch (error) {
throw new AuthError('Failed to sign in', error);
}
};


#### Sign Up
typescript
const signUp = async (email: string, password: string) => {
try {
await createUserWithEmailAndPassword(auth, email, password);
} catch (error) {
throw new AuthError('Failed to create account', error);
}
};


#### Password Reset:

typescript
const resetPassword = async (email: string) => {
try {
await sendPasswordResetEmail(auth, email);
} catch (error) {
throw new AuthError('Failed to reset password', error);
}
};


## Development
bash
Install dependencies
npm install
Build package
npm run build
Development with watch mode
npm run dev
Lint code
npm run lint
Clean build files
npm run clean


## Error Handling

The package includes comprehensive error handling for all authentication operations:
- Sign in/up failures
- Password reset errors
- Email/Password update errors
- Authentication state changes

## License

MIT

## Repository

[GitHub Repository](https://github.com/theamiteshtripathi/SaaSFactory/tree/main/packages/firebase-auth)

## Publishing

This package is published to GitHub Packages registry with restricted access.
