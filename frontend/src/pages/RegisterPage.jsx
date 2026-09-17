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
  { label: 'Cadastre-se' },
];

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate   = useNavigate();

  // ── estado (lógica intacta) ──────────────────────────────
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await signUp(form);
      navigate('/');
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: [err.response?.data?.message ?? 'Erro ao criar conta.'] });
      }
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (field) =>
    errors[field]?.[0] ? <span className="auth-field-error">{errors[field][0]}</span> : null;

  // ── render ───────────────────────────────────────────────
  return (
    <MainLayout breadcrumbs={BREADCRUMBS}>
      <div className="auth-page">
        <h1 className="auth-title">Criar uma conta</h1>
        <p className="auth-subtitle">
          Compre mais rápido e acompanhe seus pedidos em um só lugar!
        </p>

        {errors.general && <p className="auth-error">{errors.general[0]}</p>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Nome */}
          <div className="auth-field">
            <label htmlFor="name">Nome completo</label>
            <input
              id="name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="ex.: Maria Perez"
              required
              value={form.name}
              onChange={handleChange}
            />
            {fieldError('name')}
          </div>

          {/* E-mail */}
          <div className="auth-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="ex.: seunome@email.com.br"
              required
              value={form.email}
              onChange={handleChange}
            />
            {fieldError('email')}
          </div>

          {/* Senha */}
          <div className="auth-field">
            <label htmlFor="password">Senha</label>
            <div className="auth-password-wrapper">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
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
            {fieldError('password')}
          </div>

          {/* Confirmar senha */}
          <div className="auth-field">
            <label htmlFor="password_confirmation">Confirmar senha</label>
            <div className="auth-password-wrapper">
              <input
                id="password_confirmation"
                type={showConf ? 'text' : 'password'}
                name="password_confirmation"
                autoComplete="new-password"
                required
                value={form.password_confirmation}
                onChange={handleChange}
              />
              <button
                type="button"
                className="auth-eye-btn"
                aria-label={showConf ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                onClick={() => setShowConf((v) => !v)}
              >
                <IconEye open={showConf} />
              </button>
            </div>
          </div>

          {/* reCAPTCHA visual placeholder */}
          <div className="auth-captcha">
            <div className="captcha-box">
              <span className="captcha-checkbox" />
              <span>Não sou um robô</span>
              <div className="captcha-logo">
                🔒<br />reCAPTCHA
              </div>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="auth-alt-link">
          Já possui uma conta?{' '}
          <Link to="/login">Iniciar sessão</Link>
        </p>
      </div>
    </MainLayout>
  );
}

