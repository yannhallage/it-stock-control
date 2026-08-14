import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthGuard } from '@core/auth/AuthGuard'
import { Layout } from '@shared/layout/Layout'

const AuthPage = lazy(() =>
  import('@features/auth').then((m) => ({ default: m.AuthPage })),
)
const DashboardPage = lazy(() =>
  import('@features/dashboard').then((m) => ({ default: m.DashboardPage })),
)
const AssetsPage = lazy(() =>
  import('@features/assets').then((m) => ({ default: m.AssetsPage })),
)
const AssetDetailsPage = lazy(() =>
  import('@features/assets').then((m) => ({ default: m.AssetDetailsPage })),
)
const InventoryPage = lazy(() =>
  import('@features/inventory').then((m) => ({ default: m.InventoryPage })),
)
const AssignmentsPage = lazy(() =>
  import('@features/assignments').then((m) => ({ default: m.AssignmentsPage })),
)
const IncidentsPage = lazy(() =>
  import('@features/incidents').then((m) => ({ default: m.IncidentsPage })),
)
const WorkshopPage = lazy(() =>
  import('@features/workshop').then((m) => ({ default: m.WorkshopPage })),
)
const ScreenLoansPage = lazy(() =>
  import('@features/screen-loans').then((m) => ({ default: m.ScreenLoansPage })),
)
const MachinesStatsPage = lazy(() =>
  import('@features/machines-stats').then((m) => ({ default: m.MachinesStatsPage })),
)
const SuppliersPage = lazy(() =>
  import('@features/referentiels/suppliers').then((m) => ({ default: m.SuppliersPage })),
)
const MaterialTypesPage = lazy(() =>
  import('@features/referentiels/material-types').then((m) => ({ default: m.MaterialTypesPage })),
)
const DepartmentsPage = lazy(() =>
  import('@features/referentiels/departments').then((m) => ({ default: m.DepartmentsPage })),
)
const EmployeesPage = lazy(() =>
  import('@features/referentiels/employees').then((m) => ({ default: m.EmployeesPage })),
)
const CategoriesPage = lazy(() =>
  import('@features/referentiels/categories').then((m) => ({ default: m.CategoriesPage })),
)
const BrandsPage = lazy(() =>
  import('@features/referentiels/brands').then((m) => ({ default: m.BrandsPage })),
)
const LocationsPage = lazy(() =>
  import('@features/referentiels/locations').then((m) => ({ default: m.LocationsPage })),
)
const MaintenancesPage = lazy(() =>
  import('@features/maintenances').then((m) => ({ default: m.MaintenancesPage })),
)
const MovementsPage = lazy(() =>
  import('@features/movements').then((m) => ({ default: m.MovementsPage })),
)

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <Layout>
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
                <Route path="/employes" element={<EmployeesPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/marques" element={<BrandsPage />} />
                <Route path="/emplacements" element={<LocationsPage />} />
                <Route path="/maintenances" element={<MaintenancesPage />} />
                <Route path="/mouvements" element={<MovementsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </AuthGuard>
        }
      />
    </Routes>
  )
}
