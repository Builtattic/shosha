import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import { ToastProvider } from './components/ui/Toast'
import { ReportModalProvider } from './contexts/ReportModalContext'
import { NotificationsProvider } from './contexts/NotificationsContext'
import { router } from './routes'
import './index.css'

const devModules = import.meta.glob('./DevElementResizer*.tsx', { eager: true });
const DevToggle = Object.values(devModules)[0] ? (Object.values(devModules)[0] as any).default : null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationsProvider>
            <ReportModalProvider>
              <ToastProvider>
                <RouterProvider router={router} />
                {DevToggle && <DevToggle />}
              </ToastProvider>
            </ReportModalProvider>
          </NotificationsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
