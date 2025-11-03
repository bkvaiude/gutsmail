'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');

    if (errorParam === 'OAuthAccountNotLinked' && session) {
      // User is trying to sign in with a different account while already logged in
      // Force sign out and show helpful message
      setIsSigningOut(true);
      setError('You attempted to sign in with a different account. Signing you out...');

      signOut({ redirect: false }).then(() => {
        setIsSigningOut(false);
        setError('Please sign in again with your desired account.');
      });
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        OAuthAccountNotLinked: 'Account conflict detected. Please try signing in again.',
        Callback: 'Authentication callback failed. Please try again.',
        OAuthSignin: 'Error starting OAuth sign-in.',
        OAuthCallback: 'Error during OAuth callback.',
        Default: 'An authentication error occurred.',
      };
      setError(errorMessages[errorParam] || errorMessages.Default);
    }
  }, [searchParams, session]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-normal text-gray-900 mb-2">
            GutsMail
          </h1>
          <p className="text-sm text-gray-600 mb-1">
            AI-powered email sorting and management
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>
              Powered by{' '}
              <a
                href="https://highguts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                Highguts Solution LLP
              </a>
            </p>
            <p className="text-gray-400">One-Man Company • Individual Tech Consultant & Freelancer</p>
          </div>
        </div>

        {error && (
          <div className={`p-4 rounded-md ${isSigningOut ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-sm ${isSigningOut ? 'text-yellow-800' : 'text-red-800'}`}>
              {error}
            </p>
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            disabled={isSigningOut}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded transition-colors ${
              isSigningOut
                ? 'bg-gray-100 cursor-not-allowed opacity-50'
                : 'hover:bg-gray-50'
            }`}
          >
            {isSigningOut ? (
              <>
                <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  Signing out...
                </span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  Sign in with Google
                </span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          We'll request access to your Gmail to sort and manage your emails
        </p>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
