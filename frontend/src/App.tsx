import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProfileEditor from './pages/ProfileEditor';
import ProfileCreate from './pages/ProfileCreate';
import PublicProfile from './pages/PublicProfile';
import BookingPage from './pages/BookingPage';
import ServicesDashboard from './pages/ServicesDashboard';
import AvailabilityDashboard from './pages/AvailabilityDashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/services" element={<ProtectedRoute><ServicesDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/availability" element={<ProtectedRoute><AvailabilityDashboard /></ProtectedRoute>} />
            <Route path="/profile/edit/:id" element={<ProtectedRoute><ProfileEditor /></ProtectedRoute>} />
            <Route path="/profile/new" element={<ProtectedRoute><ProfileEditor /></ProtectedRoute>} />
            <Route path="/profile/create" element={<ProtectedRoute><ProfileCreate /></ProtectedRoute>} />
            <Route path="/book/:slug" element={<BookingPage />} />
            <Route path="/:slug" element={<PublicProfile />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
