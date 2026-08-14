import { Suspense } from 'react'
import { BeatLoader } from 'react-spinners'
import { AppRoutes } from './app.routes'

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <BeatLoader color="#16a34a" />
        </div>
      }
    >
      <AppRoutes />
    </Suspense>
  )
}
