import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getSession } from '../lib/auth'

function Tooltip({
  children,
  text,
  placement = 'right',
}: {
  children: React.ReactNode
  text: string
  placement?: 'right' | 'bottom' | 'left'
}) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)

  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gap = 8
    if (placement === 'right') {
      setCoords({ top: rect.top + rect.height / 2, left: rect.right + gap })
    } else if (placement === 'left') {
      setCoords({ top: rect.top + rect.height / 2, left: rect.left - gap })
    } else {
      setCoords({ top: rect.bottom + gap, left: rect.left + rect.width / 2 })
    }
  }, [placement])

  const show = useCallback(() => {
    updatePosition()
    setVisible(true)
  }, [updatePosition])

  const hide = useCallback(() => {
    setVisible(false)
  }, [])

  const tooltipContent = visible && (
    <span
      className="fixed z-[100] whitespace-nowrap rounded-md bg-[var(--color-primary)] px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
      style={
        placement === 'bottom'
          ? { top: coords.top, left: coords.left, transform: 'translate(-50%, 0)' }
          : placement === 'left'
            ? { top: coords.top, left: coords.left, transform: 'translate(-100%, -50%)' }
            : { top: coords.top, left: coords.left, transform: 'translateY(-50%)' }
      }
      role="tooltip"
    >
      {text}
    </span>
  )

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {children}
      </span>
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  )
}

const navItems: Array<{ to: string; label: string; icon: React.ReactNode }> = [
  {
    to: '/',
    label: 'Dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/assets',
    label: 'Stock',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    to: '/types-materiel',
    label: 'Types matériel',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 7h16M4 12h16M4 17h10"
        />
      </svg>
    ),
  },
  {
    to: '/affectations',
    label: 'Affectations',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    to: '/pannes',
    label: 'Pannes',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    to: '/atelier',
    label: 'Atelier',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/emprunts-materiel',
    label: 'Emprunts matériel',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16v10H4V5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 19h8M12 15v4" />
      </svg>
    ),
  },
  {
    to: '/statistiques-machines',
    label: 'Statistiques machines',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 19V5m0 14h16M8 16V9m4 7V7m4 9v-4"
        />
      </svg>
    ),
  },
  {
    to: '/fournisseurs',
    label: 'Fournisseurs',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
]

function SidebarNavItem({
  to,
  label,
  icon,
}: {
  to: string
  label: string
  icon: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center justify-center rounded-lg p-3 transition-colors',
          isActive
            ? 'bg-gray-100 text-[var(--color-primary)]'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
        ].join(' ')
      }
      end={to === '/'}
    >
      <Tooltip text={label}>{icon}</Tooltip>
    </NavLink>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const session = getSession()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleLogout = () => {
    setShowLogoutModal(false)
    clearSession()
    navigate('/login', { replace: true })
  }

  const openLogoutModal = () => setShowLogoutModal(true)
  const closeLogoutModal = () => setShowLogoutModal(false)

  useEffect(() => {
    if (showLogoutModal) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [showLogoutModal])

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900">
      {/* Sidebar fixe : pas de scroll, toujours visible */}
      <aside
        className="fixed inset-y-0 left-0 z-20 flex h-screen w-16 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white"
        aria-label="Navigation principale"
      >
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-gray-200 bg-transparent">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-transparent text-white">
            {/* Ancien logo SVG */}
            {/*
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            */}
            {/* Nouveau blason de la Côte d'Ivoire */}
            <img
              src="https://www.assnat.ci/imgsite/logo-anci4.png"
              alt="Blason de la Côte d'Ivoire"
              className="h-8 w-8 object-contain"
              style={{ maxHeight: 32, maxWidth: 32 }}
            />
          </div>
        </div>
        <nav className="flex-1 overflow-hidden p-2" style={{ minHeight: 0 }}>
          <div className="flex h-full flex-col justify-center gap-1">
            {navItems.map((item) => (
              <SidebarNavItem key={item.to} to={item.to} label={item.label} icon={item.icon} />
            ))}
          </div>
        </nav>
        <div className="shrink-0 border-t border-gray-200 p-3">
          <div className="flex flex-col items-center gap-2">
            {session ? (
              <span className="max-w-full truncate px-1 text-center text-xs text-gray-600" title={session.user}>
                {/* {session.user} */}
              </span>
            ) : null}
            <button
              type="button"
              onClick={openLogoutModal}
              className="rounded p-2 cursor-pointer text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <Tooltip text="Déconnexion">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </Tooltip>
            </button>
          </div>
        </div>
      </aside>

      {/* Zone principale : marge gauche = largeur sidebar, seul le main scrolle */}
      <div className="flex min-h-screen min-w-0 flex-col pl-16">
        {/* Barre d'onglets horizontale + contrôles */}
        <header className="flex min-w-0 shrink-0 flex-col border-b border-gray-200 bg-white">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6">
            <h1 className="text-lg font-semibold text-gray-900">Parc Info</h1>
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600">
                {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
              {/* <button
                type="button"
                className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <Tooltip text="Options" placement="bottom">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </Tooltip>
              </button> */}
            </div>
          </div>
          <nav className="mt-4 flex min-w-0 gap-1 overflow-x-auto px-4 sm:px-6">
            {navItems.map((item) => {
              const active = isActive(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={[
                    'shrink-0 border-b-2 px-4 py-3 text-sm transition-colors',
                    active ? 'tab-active' : 'tab-inactive border-transparent',
                  ].join(' ')}
                >
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#fafafa] p-4 sm:p-6">
          {children}
        </main>
      </div>

      {/* Modal d'avertissement déconnexion */}
      {showLogoutModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            onClick={closeLogoutModal}
          >
            <div
              className="max-w-sm bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 id="logout-modal-title" className="text-lg font-semibold text-gray-900">
                Déconnexion
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Êtes-vous sûr de vouloir vous déconnecter ?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeLogoutModal}
                  className="rounded-md  cursor-pointer border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md cursor-pointer bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
