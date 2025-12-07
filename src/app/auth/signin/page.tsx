"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <div className="signin-page">
      <div className="signin-card">
        <div className="header">
          <span className="logo">📅</span>
          <h1>Welcome to Calendar</h1>
          <p>Sign in to manage your schedule</p>
        </div>

        <div className="providers">
          <button
            className="provider-btn google"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <button
            className="provider-btn microsoft"
            onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/" })}
          >
            <svg viewBox="0 0 21 21" width="20" height="20">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Continue with Outlook
          </button>

          <div className="dev-login">
            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>Development Login</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
              signIn("credentials", { email, callbackUrl: "/" });
            }}>
              <input name="email" type="email" placeholder="user@example.com" style={{ padding: '8px', width: '100%', marginBottom: '8px' }} />
              <button type="submit" className="provider-btn">Sign in with Email</button>
            </form>
          </div>
        </div>

        <p className="terms">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      <style jsx>{`
        .signin-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: var(--spacing-lg);
        }

        .signin-card {
          background: var(--color-bg-main);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          width: 100%;
          max-width: 400px;
          box-shadow: var(--shadow-lg);
          text-align: center;
        }

        .header {
          margin-bottom: var(--spacing-xl);
        }

        .logo {
          font-size: 3rem;
          display: block;
          margin-bottom: var(--spacing-md);
        }

        .header h1 {
          font-size: 1.5rem;
          margin-bottom: var(--spacing-xs);
        }

        .header p {
          color: var(--color-text-secondary);
        }

        .providers {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .provider-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          background: var(--color-bg-main);
          color: var(--color-text-main);
        }

        .provider-btn:hover {
          background: var(--color-bg-secondary);
          border-color: var(--color-text-light);
        }

        .terms {
          margin-top: var(--spacing-xl);
          font-size: 0.75rem;
          color: var(--color-text-light);
        }
      `}</style>
    </div>
  );
}
