import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { isAuthenticated } from './lib/auth'
import { Layout } from './components/Layout'
import { AuthPage } from './pages/Auth'
import { DashboardPage } from './pages/Dashboard'
import { AssetsPage } from './pages/Assets'
import { AssignmentsPage } from './pages/Assignments'
import { IncidentsPage } from './pages/Incidents'
import { WorkshopPage } from './pages/Workshop'
import { ScreenLoansPage } from './pages/ScreenLoans'
import { MachinesStatsPage } from './pages/MachinesStats'
import { AssetDetailsPage } from './pages/AssetDetails'
import { SuppliersPage } from './pages/Suppliers'
import { MaterialTypesPage } from './pages/MaterialTypes'

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  if (!isAuthenticated()) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/*"
        element={
          <ProtectedLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/assets/:id" element={<AssetDetailsPage />} />
              <Route path="/affectations" element={<AssignmentsPage />} />
              <Route path="/pannes" element={<IncidentsPage />} />
              <Route path="/atelier" element={<WorkshopPage />} />
              <Route path="/emprunts-materiel" element={<ScreenLoansPage />} />
              <Route path="/emprunts-ecrans" element={<Navigate to="/emprunts-materiel" replace />} />
              <Route path="/statistiques-machines" element={<MachinesStatsPage />} />
              <Route path="/fournisseurs" element={<SuppliersPage />} />
              <Route path="/types-materiel" element={<MaterialTypesPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ProtectedLayout>
        }
      />
    </Routes>
  )
}
