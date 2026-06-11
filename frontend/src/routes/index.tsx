import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { OnboardingGuard } from './OnboardingGuard';
import { AppShell } from '@/components/nav/AppShell';
import AdminRoute from '@/components/nav/AdminRoute';
import AdminLayout from '@/components/admin/AdminLayout';

// Public pages
import Landing from '@/pages/Landing';
import Notifications from '@/pages/Notifications';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminQueue from '@/pages/admin/AdminQueue';
import AdminModeration from '@/pages/admin/AdminModeration';
import AdminReview from '@/pages/admin/AdminReview';
import AdminClaims from '@/pages/admin/AdminClaims';
import AdminDisputes from '@/pages/admin/AdminDisputes';
import AdminEvidence from '@/pages/admin/AdminEvidence';
import AdminAudits from '@/pages/admin/AdminAudits';
import AdminAbuse from '@/pages/admin/AdminAbuse';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminAccounts from '@/pages/admin/AdminAccounts';
import AdminDeletionRequests from '@/pages/admin/AdminDeletionRequests';
import AdminTrustBadge from '@/pages/admin/AdminTrustBadge';
import AdminIssues from '@/pages/admin/AdminIssues';
import AdminActivity from '@/pages/admin/AdminActivity';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminData from '@/pages/admin/AdminData';
import AdminCreate from '@/pages/admin/AdminCreate';
import AdminFeed from '@/pages/admin/AdminFeed';

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
import ProfileUpgrade from '@/pages/ProfileUpgrade';
import Billing from '@/pages/Billing';
import LegalHub from '@/pages/legal/LegalHub';
import LegalPage from '@/pages/legal/LegalPage';
import Bookmarks from '@/pages/Bookmarks';
import Disputes from '@/pages/Disputes';
import Search from '@/pages/Search';
import Impact from '@/pages/Impact';
import Ranks from '@/pages/Ranks';
import Settings from '@/pages/Settings';
import Access from '@/pages/Access';
import HowItWorks from '@/pages/HowItWorks';
import Leaderboard from '@/pages/Leaderboard';
import ReportIssue from '@/pages/ReportIssue';
import PublicProfile from '@/pages/PublicProfile';
import SlugPage from '@/pages/SlugPage';

function AccountRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/accounts/${id}`} replace />;
}

function PostRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/reports/${id}`} replace />;
}

// Wraps all authenticated + onboarded routes with chrome (Sidebar + MobileAppHeader + BottomNav)
const AppRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <OnboardingGuard>
      <AppShell>{children}</AppShell>
    </OnboardingGuard>
  </ProtectedRoute>
);

const AdminPageRoute = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute>
    <OnboardingGuard>
      <AdminRoute>
        <AdminLayout>{children}</AdminLayout>
      </AdminRoute>
    </OnboardingGuard>
  </ProtectedRoute>
);

export const router = createBrowserRouter([
  // Landing (public)
  { path: '/', element: <Landing /> },

  // Auth
  { path: '/sign-in', element: <SignIn /> },
  { path: '/sign-up', element: <Navigate to="/sign-in" replace /> },
  { path: '/login',   element: <Navigate to="/sign-in" replace /> },

  // Onboarding (auth required, onboarding guard NOT applied here to avoid loop)
  { path: '/onboard',    element: <ProtectedRoute><Onboard /></ProtectedRoute> },
  { path: '/onboarding', element: <Navigate to="/onboard" replace /> },

  // Public informational pages
  { path: '/how-it-works', element: <HowItWorks /> },
  { path: '/leaderboard',  element: <Leaderboard /> },
  { path: '/report-issue', element: <ReportIssue /> },
  { path: '/trust-badge', element: <TrustBadge /> },
  { path: '/legal-policies', element: <LegalHub /> },
  { path: '/legal-policies/:section/:slug', element: <LegalPage /> },

  // Dashboard
  { path: '/dashboard', element: <AppRoute><Dashboard /></AppRoute> },
  { path: '/feed',      element: <AppRoute><Feed /></AppRoute> },

  // Profile (static segments before :id)
  { path: '/profile/edit', element: <AppRoute><EditProfile /></AppRoute> },
  { path: '/profile/upgrade', element: <AppRoute><ProfileUpgrade /></AppRoute> },
  { path: '/profile/:id',  element: <PublicProfile /> },
  { path: '/profile',      element: <AppRoute><Profile /></AppRoute> },

  // Accounts (static routes before :id)
  { path: '/accounts/search', element: <AppRoute><AccountSearch /></AppRoute> },
  { path: '/accounts/new',    element: <AppRoute><AccountNew /></AppRoute> },
  { path: '/accounts/:id',    element: <AppRoute><AccountDetail /></AppRoute> },
  { path: '/accounts',        element: <AppRoute><Accounts /></AppRoute> },
  { path: '/account/:id',   element: <AppRoute><AccountRedirect /></AppRoute> },

  // Reports
  { path: '/reports/new', element: <AppRoute><ReportNew /></AppRoute> },
  { path: '/reports/:id', element: <AppRoute><ReportDetail /></AppRoute> },

  // Bubbles
  { path: '/bubbles',     element: <AppRoute><Bubbles /></AppRoute> },
  { path: '/bubbles/new', element: <AppRoute><BubbleNew /></AppRoute> },
  { path: '/bubbles/:id', element: <AppRoute><BubbleDetail /></AppRoute> },

  // People
  { path: '/people', element: <AppRoute><People /></AppRoute> },

  // Payments
  { path: '/subscribe', element: <Navigate to="/profile/upgrade" replace /> },
  { path: '/billing',   element: <AppRoute><Billing /></AppRoute> },

  // Admin
  { path: '/admin', element: <AdminPageRoute><AdminDashboard /></AdminPageRoute> },
  { path: '/admin/queue', element: <AdminPageRoute><AdminQueue /></AdminPageRoute> },
  { path: '/admin/moderation', element: <AdminPageRoute><AdminModeration /></AdminPageRoute> },
  { path: '/admin/review/:reportId', element: <AdminPageRoute><AdminReview /></AdminPageRoute> },
  { path: '/admin/claims', element: <AdminPageRoute><AdminClaims /></AdminPageRoute> },
  { path: '/admin/disputes', element: <AdminPageRoute><AdminDisputes /></AdminPageRoute> },
  { path: '/admin/evidence', element: <AdminPageRoute><AdminEvidence /></AdminPageRoute> },
  { path: '/admin/audits', element: <AdminPageRoute><AdminAudits /></AdminPageRoute> },
  { path: '/admin/abuse', element: <AdminPageRoute><AdminAbuse /></AdminPageRoute> },
  { path: '/admin/users', element: <AdminPageRoute><AdminUsers /></AdminPageRoute> },
  { path: '/admin/accounts', element: <AdminPageRoute><AdminAccounts /></AdminPageRoute> },
  { path: '/admin/deletion-requests', element: <AdminPageRoute><AdminDeletionRequests /></AdminPageRoute> },
  { path: '/admin/trust-badge', element: <AdminPageRoute><AdminTrustBadge /></AdminPageRoute> },
  { path: '/admin/issues', element: <AdminPageRoute><AdminIssues /></AdminPageRoute> },
  { path: '/admin/activity', element: <AdminPageRoute><AdminActivity /></AdminPageRoute> },
  { path: '/admin/settings', element: <AdminPageRoute><AdminSettings /></AdminPageRoute> },
  { path: '/admin/data', element: <AdminPageRoute><AdminData /></AdminPageRoute> },
  { path: '/admin/create', element: <AdminPageRoute><AdminCreate /></AdminPageRoute> },
  { path: '/admin/feed', element: <AdminPageRoute><AdminFeed /></AdminPageRoute> },

  // Settings / Notifications
  { path: '/notifications', element: <AppRoute><Notifications /></AppRoute> },
  { path: '/bookmarks',     element: <AppRoute><Bookmarks /></AppRoute> },
  { path: '/disputes',      element: <AppRoute><Disputes /></AppRoute> },
  { path: '/search',        element: <AppRoute><Search /></AppRoute> },
  { path: '/settings',      element: <AppRoute><Settings /></AppRoute> },
  { path: '/access',        element: <AppRoute><Access /></AppRoute> },
  { path: '/impact',        element: <AppRoute><Impact /></AppRoute> },
  { path: '/ranks',         element: <AppRoute><Ranks /></AppRoute> },
  { path: '/ranking',       element: <Navigate to="/ranks" replace /> },

  { path: '/post/:id', element: <PostRedirect /> },

  // Public slug catch-all — MUST be last
  { path: '/:slug', element: <SlugPage /> },
]);
