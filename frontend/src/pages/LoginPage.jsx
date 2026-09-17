import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../layouts/MainLayout';
import '../styles/auth.css';

/* ── Eye toggle icon ── */
const IconEye = ({ open }) =>
  open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

const BREADCRUMBS = [
  { label: 'Início',     to: '/' },
  { label: 'Minha Conta' },
  { label: 'Login' },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  // ── estado (lógica intacta) ──────────────────────────────
  const [form, setForm]         = useState({ email: '', password: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(form);
      navigate('/');
    } catch (err) {
      const msg =
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.message ||
        'Erro ao realizar login. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── render ───────────────────────────────────────────────
  return (
    <MainLayout breadcrumbs={BREADCRUMBS}>
      <div className="auth-page">
        <h1 className="auth-title">Iniciar sessão</h1>

        {error && <p className="auth-error">{error}</p>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* E-mail */}
          <div className="auth-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
            />
          </div>

          {/* Senha com toggle */}
          <div className="auth-field">
            <label htmlFor="password">Senha</label>
            <div className="auth-password-wrapper">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
              />
              <button
                type="button"
                className="auth-eye-btn"
                aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPass((v) => !v)}
              >
                <IconEye open={showPass} />
              </button>
            </div>
          </div>

          {/* Esqueceu a senha */}
          <div className="auth-forgot">
            <a href="#">Esqueceu a senha?</a>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Entrando...' : 'Iniciar sessão'}
          </button>
        </form>

        <p className="auth-alt-link">
          Não possui uma conta ainda?{' '}
          <Link to="/register">Criar uma conta</Link>
        </p>
      </div>
    </MainLayout>
  );
}

