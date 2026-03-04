import type React from 'react'
import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { PulseLoader } from 'react-spinners'
import { getSession, setSession } from '../lib/auth'
import { useLogin } from '../api/hooks/useLogin'

const DEFAULT_IDENTIFIER = import.meta.env.VITE_DEFAULT_IDENTIFIER
const DEFAULT_PASSWORD = import.meta.env.VITE_DEFAULT_PASSWORD

export function AuthPage() {
  const [identifier, setIdentifier] = useState(DEFAULT_IDENTIFIER)
  const [password, setPassword] = useState(DEFAULT_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'
  const { login, loading, error: apiError } = useLogin()

  if (getSession()) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!identifier.trim()) {
      setError('Veuillez saisir votre identifiant.')
      return
    }
    if (!password) {
      setError('Veuillez saisir votre mot de passe.')
      return
    }
    try {
      await login({ email: identifier.trim(), password })
      setSession(identifier.trim())
      navigate(redirectTo, { replace: true })
    } catch (err) {
      // L'erreur principale vient déjà du hook (apiError), mais on garde un fallback local
      setError(err instanceof Error ? err.message : 'Erreur de connexion.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fff] px-4 py-12">
      {/* Fond : grille légère */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #fff 1px, transparent 1px),
            linear-gradient(to bottom, #fff 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-[400px]">
        {/* Bandeau d’en-tête */}
        <div className="flex items-center justify-center gap-3 bg-[var(--color-primary)] py-5">
          {/* <svg
            className="h-9 w-9 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 0H5m14 0h2m2 0h-2M3 15h2m2 0H9m14 0h-2m-2 0h2M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
            />
          </svg> */}
          <span className="text-lg font-semibold tracking-wide text-white">
            ASSNAT
          </span>
        </div>

        {/* Contenu */}
        <div className="bg-white shadow-2xl">
          <div className="px-8 py-8">
            <h1 className="text-center text-xl font-semibold tracking-tight text-gray-900">
              Bienvenue
            </h1>
            <p className="mt-1 text-center text-sm text-gray-500">
              Votre portail de gestion du parc informatique
            </p>

            <form onSubmit={handleSubmit} className="mt-8">
              {error || apiError ? (
                <div className="mb-5 bg-red-50 py-2.5 px-3 text-sm text-red-800">
                  {error ?? apiError}
                </div>
              ) : null}

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                    Identifiant
                  </span>
                  <input
                    type="text"
                    autoComplete="username"
                    placeholder="Adresse email ou identifiant"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={loading}
                    className="w-full border-0 border-b-2 border-gray-200 bg-transparent py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
                    Mot de passe
                  </span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full border-0 border-b-2 border-gray-200 bg-transparent py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-8 flex w-full cursor-pointer items-center justify-center gap-2 bg-[var(--color-primary)] py-3.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <PulseLoader color="#fff" size={8} margin={4} />
                    {/* <span>Connexion…</span> */}
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      <p className="mt-10 max-w-sm text-center text-xs text-gray-400">
        En vous connectant, vous acceptez l’utilisation de Parc Info. Confidentialité et
        sécurité des données prioritaires.
      </p>
    </div>
  )
}
