import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../layouts/MainLayout';
import '../styles/auth.css';

import { reenviarValidacao } from '../services/authService';
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

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

  // ── estado ──────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [token, setToken]                 = useState(null);
  const [errors, setErrors]               = useState({});
  const [loading, setLoading]             = useState(false);
  const [showPass, setShowPass]           = useState(false);
  const [showConf, setShowConf]           = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resending, setResending]         = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const captchaRef                        = useRef(null);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!token) {
      setErrors({ recaptcha: ['Por favor, confirme que você não é um robô.'] });
      return;
    }

    setLoading(true);
    try {
      await signUp({ ...form, recaptcha: token });
      setRegisteredEmail(form.email);
    } catch (err) {
      captchaRef.current?.reset();
      setToken(null);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: [err.response?.data?.message ?? 'Erro ao criar conta.'] });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMessage('');
    try {
      const { data } = await reenviarValidacao({ email: registeredEmail });
      setResendMessage(data.message || 'Link de verificação reenviado com sucesso!');
    } catch (err) {
      setResendMessage(err.response?.data?.message || 'Erro ao reenviar link. Tente novamente mais tarde.');
    } finally {
      setResending(false);
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

        {registeredEmail ? (
          <div>
            <div className="auth-confirmation-card">
              <svg
                className="auth-confirmation-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>

              <h2>Você está a um passo de criar sua conta!</h2>

              <p>
                Enviamos um link para <strong>{registeredEmail}</strong> para validar seu e-mail.
              </p>
            </div>

            <div className="auth-resend-wrapper">
              <span>Ainda não recebeu? </span>
              <button
                type="button"
                className="auth-resend-btn"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Enviando...' : 'Enviar o link novamente'}
              </button>
              {resendMessage && <p className="auth-resend-alert">{resendMessage}</p>}
            </div>
          </div>
        ) : (
          <>
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
                    placeholder="Mínimo de 8 caracteres"
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
                    placeholder="Repita a senha criada"
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

              {/* reCAPTCHA */}
              <div className="auth-captcha">
                <ReCAPTCHA
                  ref={captchaRef}
                  sitekey={SITE_KEY}
                  onChange={setToken}
                  onExpired={() => setToken(null)}
                />
              </div>
              {errors.recaptcha && (
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <span className="auth-field-error">{errors.recaptcha[0]}</span>
                </div>
              )}

              <button type="submit" className="auth-btn" disabled={loading || !token}>
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>

            <p className="auth-alt-link">
              Já possui uma conta?{' '}
              <Link to="/login">Iniciar sessão</Link>
            </p>
          </>
        )}
      </div>
    </MainLayout>
  );
}


