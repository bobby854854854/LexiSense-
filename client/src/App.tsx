import { Switch, Route, RouteComponentProps } from 'wouter'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ContractDetailPage } from './pages/ContractDetailPage'
import TeamPage from './pages/TeamPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import Contracts from './pages/contracts'
import ContractUpload from './pages/contract-upload'
import AIDrafting from './pages/ai-drafting'
import Analytics from './pages/analytics'
import { NotFoundPage } from './pages/NotFoundPage'
import { MainLayout } from './components/layout/MainLayout'

export function App() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return null
  }

  return (
    <>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/accept-invite" component={AcceptInvitePage} />

        {/* Protected Routes */}
        <ProtectedRoute
          path="/dashboard"
          isAuthenticated={isAuthenticated}
          component={() => (
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          )}
        />

        <ProtectedRoute
          path="/contracts"
          isAuthenticated={isAuthenticated}
          component={() => (
            <MainLayout>
              <Contracts />
            </MainLayout>
          )}
        />

        <ProtectedRoute
          path="/contracts/:id"
          isAuthenticated={isAuthenticated}
          component={(params) => (
            <MainLayout>
              <ContractDetailPage id={params.id} />
            </MainLayout>
          )}
        />

        <ProtectedRoute
          path="/upload"
          isAuthenticated={isAuthenticated}
          component={() => (
            <MainLayout>
              <ContractUpload />
            </MainLayout>
          )}
        />

        <ProtectedRoute
          path="/ai-drafting"
          isAuthenticated={isAuthenticated}
          component={() => (
            <MainLayout>
              <AIDrafting />
            </MainLayout>
          )}
        />

        <ProtectedRoute
          path="/analytics"
          isAuthenticated={isAuthenticated}
          component={() => (
            <MainLayout>
              <Analytics />
            </MainLayout>
          )}
        />

        <ProtectedRoute
          path="/team"
          isAuthenticated={isAuthenticated}
          component={() => (
            <MainLayout>
              <TeamPage />
            </MainLayout>
          )}
        />

        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
      <Toaster />
    </>
  )
}