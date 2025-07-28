import { AuthProvider } from './contexts/AuthContext';
import { HospitalDataProvider } from './contexts/HospitalDataContext';
import AuthContainer from './components/auth/AuthContainer';
import Dashboard from './components/dashboard/Dashboard';
import { useAuth } from './contexts/AuthContext';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthContainer />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <HospitalDataProvider>
        <div className="min-h-screen bg-gray-50">
          <AppContent />
        </div>
      </HospitalDataProvider>
    </AuthProvider>
  );
}

export default App;