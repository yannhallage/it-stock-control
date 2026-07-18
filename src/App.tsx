import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { isAuthenticated } from './lib/auth'
import { Layout } from './components/Layout'
import { AuthPage } from './pages/Auth'
import { DashboardPage } from './pages/Dashboard'
import { AssetsPage } from './pages/Assets'
import { InventoryPage } from './pages/Inventory'
import { AssignmentsPage } from './pages/Assignments'
import { IncidentsPage } from './pages/Incidents'
import { WorkshopPage } from './pages/Workshop'
import { ScreenLoansPage } from './pages/ScreenLoans'
import { MachinesStatsPage } from './pages/MachinesStats'
import { AssetDetailsPage } from './pages/AssetDetails'
import { SuppliersPage } from './pages/Suppliers'
import { MaterialTypesPage } from './pages/MaterialTypes'
import { DepartmentsPage } from './pages/Departments'
import { CategoriesPage } from './pages/Categories'
import { BrandsPage } from './pages/Brands'
import { LocationsPage } from './pages/Locations'
import { MaintenancesPage } from './pages/Maintenances'
import { MovementsPage } from './pages/Movements'

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
              <Route path="/inventaire" element={<InventoryPage />} />
              <Route path="/affectations" element={<AssignmentsPage />} />
              <Route path="/pannes" element={<IncidentsPage />} />
              <Route path="/atelier" element={<WorkshopPage />} />
              <Route path="/emprunts-materiel" element={<ScreenLoansPage />} />
              <Route path="/emprunts-ecrans" element={<Navigate to="/emprunts-materiel" replace />} />
              <Route path="/statistiques-machines" element={<MachinesStatsPage />} />
              <Route path="/fournisseurs" element={<SuppliersPage />} />
              <Route path="/types-materiel" element={<MaterialTypesPage />} />
              <Route path="/departements" element={<DepartmentsPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/marques" element={<BrandsPage />} />
              <Route path="/emplacements" element={<LocationsPage />} />
              <Route path="/maintenances" element={<MaintenancesPage />} />
              <Route path="/mouvements" element={<MovementsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ProtectedLayout>
        }
      />
    </Routes>
  )
}
