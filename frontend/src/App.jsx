import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import './App.css';

function Dashboard() {
  const { user, signOut } = useAuth();
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Bem-vindo, {user?.name}!</h1>
      <p>E-mail: {user?.email}</p>
      <button onClick={signOut} style={{ marginTop: '1rem' }}>
        Sair
      </button>
    </main>
  );
}

function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Rotas protegidas */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Qualquer outra rota redireciona para home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
