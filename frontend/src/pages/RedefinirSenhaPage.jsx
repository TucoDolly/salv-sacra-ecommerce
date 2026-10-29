import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import '../styles/auth.css';

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
  { label: 'Início', to: '/' },
  { label: 'Redefinir Senha' },
];

export default function RedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (password.length < 8) {
      setErro('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (password !== passwordConfirmation) {
      setErro('A confirmação de senha não confere.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post('/auth/redefinir-senha', {
        token,
        email: emailParam,
        password,
        password_confirmation: passwordConfirmation,
      });

      setSucesso(true);
      setMensagemSucesso(data.message || 'Senha alterada com sucesso!');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setErro(err.response?.data?.message || 'Não foi possível redefinir sua senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout breadcrumbs={BREADCRUMBS}>
      <div className="auth-page">
        <h1 className="auth-title">Nova Senha</h1>
        <p className="auth-subtitle">
          Crie uma nova senha de acesso segura para a sua conta Salv Sacra.
        </p>

        {erro && <div className="auth-error-banner" role="alert">{erro}</div>}
        {sucesso && (
          <div className="auth-success-banner" style={{ backgroundColor: '#eafaf1', border: '1px solid #a9dfbf', color: '#1e8449', padding: '14px 16px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5 }}>
            {mensagemSucesso}
            <br />
            <strong>Redirecionando para a página de login em instantes...</strong>
          </div>
        )}

        {!sucesso && (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="password">Nova Senha</label>
              <div className="auth-password-wrapper">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="Mínimo de 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="auth-field">
              <label htmlFor="password_confirmation">Confirmar Nova Senha</label>
              <input
                id="password_confirmation"
                type={showPass ? 'text' : 'password'}
                name="password_confirmation"
                required
                placeholder="Repita a nova senha"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
              <button
                type="submit"
                className="auth-btn"
                disabled={loading}
                style={{ maxWidth: '320px', width: '100%' }}
              >
                {loading ? 'Salvando nova senha...' : 'Alterar Senha'}
              </button>
            </div>
          </form>
        )}

        <p className="auth-alt-link" style={{ marginTop: '24px' }}>
          <Link to="/login">Voltar ao Login</Link>
        </p>
      </div>
    </MainLayout>
  );
}

