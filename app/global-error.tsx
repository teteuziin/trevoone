"use client";

import React from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * GlobalError — Root fallback error boundary for Next.js App Router.
 *
 * Requirements:
 * - Must be a Client Component ('use client').
 * - Must define its own <html> and <body> tags because it replaces the root layout.
 * - Zero external dependencies (no DB, no IndexedDB, no Service Worker, no external image).
 * - Self-contained inline CSS with dark/light mode support to render even if globals.css fails.
 * - No exposure of error stacks, digests, or internal diagnostics to the user.
 */
export default function GlobalError({ reset }: GlobalErrorProps) {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Trevo One</title>
        <style>{`
          :root {
            --ge-bg: #f7f8fa;
            --ge-card: #ffffff;
            --ge-text: #18181b;
            --ge-subtext: #52525b;
            --ge-border: #e2e4e9;
            --ge-brand: #00a859;
            --ge-brand-hover: #07884b;
            --ge-btn-sec-bg: #f0f2f5;
            --ge-btn-sec-text: #18181b;
            --ge-btn-sec-hover: #e4e7eb;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --ge-bg: #000000;
              --ge-card: #090a0d;
              --ge-text: #ffffff;
              --ge-subtext: #a1a1aa;
              --ge-border: rgba(255, 255, 255, 0.1);
              --ge-brand: #00a859;
              --ge-brand-hover: #00bf65;
              --ge-btn-sec-bg: #13141a;
              --ge-btn-sec-text: #ffffff;
              --ge-btn-sec-hover: #1c1d24;
            }
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            background-color: var(--ge-bg);
            color: var(--ge-text);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            -webkit-font-smoothing: antialiased;
          }
          .ge-card {
            background-color: var(--ge-card);
            border: 1px solid var(--ge-border);
            border-radius: 1.5rem;
            padding: 2.25rem 2rem;
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
          }
          .ge-brand {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            font-size: 1.125rem;
            font-weight: 700;
            letter-spacing: -0.02em;
          }
          .ge-brand-name {
            color: var(--ge-text);
          }
          .ge-brand-accent {
            color: var(--ge-brand);
          }
          .ge-icon-wrap {
            width: 3.5rem;
            height: 3.5rem;
            border-radius: 1rem;
            background: rgba(0, 168, 89, 0.1);
            color: var(--ge-brand);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.25rem;
          }
          .ge-title {
            font-size: 1.25rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-bottom: 0.5rem;
            color: var(--ge-text);
          }
          .ge-desc {
            font-size: 0.875rem;
            line-height: 1.5;
            color: var(--ge-subtext);
            margin-bottom: 1.75rem;
          }
          .ge-actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .ge-btn {
            display: block;
            width: 100%;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: background-color 0.15s ease;
            min-height: 44px;
          }
          .ge-btn-primary {
            background-color: var(--ge-brand);
            color: #ffffff;
          }
          .ge-btn-primary:hover {
            background-color: var(--ge-brand-hover);
          }
          .ge-btn-secondary {
            background-color: var(--ge-btn-sec-bg);
            color: var(--ge-btn-sec-text);
            border: 1px solid var(--ge-border);
          }
          .ge-btn-secondary:hover {
            background-color: var(--ge-btn-sec-hover);
          }
        `}</style>
      </head>
      <body>
        <div className="ge-card" role="alert" aria-live="assertive">
          <div className="ge-brand">
            <svg
              width="28"
              height="28"
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect width="44" height="44" rx="12" fill="var(--ge-brand)" />
              <path
                d="M22 10C22 10 16 16 16 20C16 23.3137 18.6863 26 22 26C25.3137 26 28 23.3137 28 20C28 16 22 10 22 10Z"
                fill="white"
                opacity="0.9"
              />
              <path
                d="M10 22C10 22 16 28 20 28C23.3137 28 26 25.3137 26 22C26 18.6863 23.3137 16 20 16C16 16 10 22 10 22Z"
                fill="white"
                opacity="0.8"
              />
              <path
                d="M22 34C22 34 28 28 28 24C28 20.6863 25.3137 18 22 18C18.6863 18 16 20.6863 16 24C16 28 22 34 22 34Z"
                fill="white"
                opacity="0.9"
              />
              <path
                d="M34 22C34 22 28 16 24 16C20.6863 16 18 18.6863 18 22C18 25.3137 20.6863 28 24 28C28 28 34 22 34 22Z"
                fill="white"
                opacity="0.8"
              />
            </svg>
            <span className="ge-brand-name">
              Trevo <span className="ge-brand-accent">One</span>
            </span>
          </div>

          <div className="ge-icon-wrap" aria-hidden="true">
            <svg
              width="24"
              height="24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>

          <h1 className="ge-title">Não foi possível carregar o Trevo One.</h1>
          <p className="ge-desc">
            Ocorreu uma instabilidade inesperada no carregamento inicial. Tente novamente ou recarregue a aplicação.
          </p>

          <div className="ge-actions">
            <button
              type="button"
              onClick={() => reset()}
              className="ge-btn ge-btn-primary"
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={handleReload}
              className="ge-btn ge-btn-secondary"
            >
              Recarregar aplicação
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
