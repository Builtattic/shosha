import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { OnboardingGuard } from './OnboardingGuard';

// Public pages
import Landing from '@/pages/Landing';

// Auth screens
import SignIn from '@/pages/SignIn';

// Onboarding
import Onboard from '@/pages/Onboard';

// App screens (protected + onboarding complete)
import Dashboard from '@/pages/Dashboard';
import Profile from '@/pages/Profile';
import EditProfile from '@/pages/EditProfile';
import Feed from '@/pages/Feed';
import Accounts from '@/pages/Accounts';
import AccountDetail from '@/pages/AccountDetail';
import AccountNew from '@/pages/AccountNew';
import AccountSearch from '@/pages/AccountSearch';
import ReportDetail from '@/pages/ReportDetail';
import ReportNew from '@/pages/ReportNew';
import Bubbles from '@/pages/Bubbles';
import BubbleDetail from '@/pages/BubbleDetail';
import BubbleNew from '@/pages/BubbleNew';
import People from '@/pages/People';
import TrustBadge from '@/pages/TrustBadge';
import Subscribe from '@/pages/Subscribe';
import Billing from '@/pages/Billing';

// Wraps all authenticated + onboarded routes
const AppRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <OnboardingGuard>{children}</OnboardingGuard>
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  // Landing (public)
  { path: '/', element: <Landing /> },

  // Auth
  { path: '/sign-in', element: <SignIn /> },
  { path: '/login', element: <Navigate to="/sign-in" replace /> },

  // Onboarding (auth required, onboarding guard NOT applied here to avoid loop)
  {
    path: '/onboard',
    element: <ProtectedRoute><Onboard /></ProtectedRoute>,
  },
  { path: '/onboarding', element: <Navigate to="/onboard" replace /> },

  // Phase 2–9: All app routes
  { path: '/dashboard', element: <AppRoute><Dashboard /></AppRoute> },
  { path: '/feed', element: <AppRoute><Feed /></AppRoute> },

  // Profile (Phase 3)
  { path: '/profile', element: <AppRoute><Profile /></AppRoute> },
  { path: '/profile/edit', element: <AppRoute><EditProfile /></AppRoute> },

  // Accounts (Phase 4)
  { path: '/accounts', element: <AppRoute><Accounts /></AppRoute> },
  { path: '/accounts/search', element: <AppRoute><AccountSearch /></AppRoute> },
  { path: '/accounts/new', element: <AppRoute><AccountNew /></AppRoute> },
  { path: '/accounts/:id', element: <AppRoute><AccountDetail /></AppRoute> },

  // Reports (Phase 5)
  { path: '/reports/new', element: <AppRoute><ReportNew /></AppRoute> },
  { path: '/reports/:id', element: <AppRoute><ReportDetail /></AppRoute> },

  // Bubbles (Phase 7)
  { path: '/bubbles', element: <AppRoute><Bubbles /></AppRoute> },
  { path: '/bubbles/new', element: <AppRoute><BubbleNew /></AppRoute> },
  { path: '/bubbles/:id', element: <AppRoute><BubbleDetail /></AppRoute> },

  // People (Phase 8)
  { path: '/people', element: <AppRoute><People /></AppRoute> },

  // Payments / Trust (Phase 9)
  { path: '/trust-badge', element: <AppRoute><TrustBadge /></AppRoute> },
  { path: '/subscribe', element: <AppRoute><Subscribe /></AppRoute> },
  { path: '/billing', element: <AppRoute><Billing /></AppRoute> },

  // Out of scope — placeholder redirects (never dead links)
  { path: '/notifications', element: <AppRoute><Dashboard /></AppRoute> },
  { path: '/impact', element: <AppRoute><Dashboard /></AppRoute> },
  { path: '/ranks', element: <AppRoute><Dashboard /></AppRoute> },
  { path: '/admin', element: <AppRoute><Dashboard /></AppRoute> },
]);
