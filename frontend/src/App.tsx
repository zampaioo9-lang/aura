import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProfileEditor = lazy(() => import('./pages/ProfileEditor'));
const ProfileCreate = lazy(() => import('./pages/ProfileCreate'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const ServicesDashboard = lazy(() => import('./pages/ServicesDashboard'));
const AvailabilityDashboard = lazy(() => import('./pages/AvailabilityDashboard'));
const SchedulingConfig = lazy(() => import('./pages/SchedulingConfig'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Pricing = lazy(() => import('./pages/Pricing'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PayPalReturn = lazy(() => import('./pages/PayPalReturn'));
const Explorar = lazy(() => import('./pages/Explorar'));
const PsicologosDirectory = lazy(() => import('./pages/PsicologosDirectory'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #2dd4bf', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function KeepAlive() {
  useEffect(() => {
    const ping = () => fetch('https://api.aliax.io/api/health').catch(() => {});
    ping();
    const id = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}

function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <KeepAlive />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/services" element={<ProtectedRoute><ServicesDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/availability" element={<ProtectedRoute><AvailabilityDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/scheduling" element={<ProtectedRoute><SchedulingConfig /></ProtectedRoute>} />
              <Route path="/profile/edit/:id" element={<ProtectedRoute><ProfileEditor /></ProtectedRoute>} />
              <Route path="/profile/new" element={<ProtectedRoute><ProfileCreate /></ProtectedRoute>} />
              <Route path="/profile/create" element={<ProtectedRoute><ProfileCreate /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
              <Route path="/payment/paypal-return" element={<ProtectedRoute><PayPalReturn /></ProtectedRoute>} />
              <Route path="/payment/cancel" element={<Pricing />} />
              <Route path="/privacidad" element={<PrivacyPolicy />} />
              <Route path="/explorar" element={<Explorar />} />
              {/* SEO: directorio de psicólogos por país / ciudad / enfoque */}
              <Route path="/psicologos" element={<PsicologosDirectory />} />
              <Route path="/psicologos/:countryCode" element={<PsicologosDirectory />} />
              <Route path="/psicologos/:countryCode/:citySlug" element={<PsicologosDirectory />} />
              <Route path="/psicologos/:countryCode/:citySlug/:approach" element={<PsicologosDirectory />} />
              <Route path="/book/:slug" element={<BookingPage />} />
              <Route path="/review/:token" element={<ReviewPage />} />
              <Route path="/:slug" element={<PublicProfile />} />
            </Routes>
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
