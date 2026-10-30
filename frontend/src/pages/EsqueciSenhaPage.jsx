import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import MainLayout from '../layouts/MainLayout';
import '../styles/auth.css';

export default function EsqueciSenhaPage() {
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');

  const breadcrumbs = [
    { label: 'Início', to: '/' },
    { label: 'Minha Conta', to: isAuthenticated ? '/minha-conta' : '/login' },
    { label: 'Esqueci Minha Senha' },
  ];
  const [loading, setLoading] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [erro, setErro] = useState('');
  const [mostrarLinkCadastro, setMostrarLinkCadastro] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setMostrarLinkCadastro(false);
    setMensagemSucesso('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/esqueci-senha', { email });
      setMensagemSucesso(data.message || 'Instruções de redefinição enviadas com sucesso! Verifique sua caixa de entrada.');
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 404 && data?.nao_encontrado) {
        setErro(data.message);
        setMostrarLinkCadastro(true);
      } else {
        setErro(data?.message || 'Ocorreu um erro ao processar sua solicitação.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout breadcrumbs={breadcrumbs}>
      <div className="auth-page">
        <h1 className="auth-title">Recuperar Senha</h1>
        <p className="auth-subtitle">
          Digite seu e-mail cadastrado e enviaremos um link seguro para você redefinir sua senha.
        </p>

        {erro && (
          <div className="auth-error-banner" role="alert" style={{ marginBottom: '20px' }}>
            <div>{erro}</div>
            {mostrarLinkCadastro && (
              <div style={{ marginTop: '8px' }}>
                <Link to="/cadastro" style={{ fontWeight: 600, textDecoration: 'underline', color: 'inherit' }}>
                  Clique aqui para criar uma conta com este e-mail
                </Link>
              </div>
            )}
          </div>
        )}
        {mensagemSucesso && (
          <div className="auth-success-banner" style={{ backgroundColor: '#eafaf1', border: '1px solid #a9dfbf', color: '#1e8449', padding: '12px 16px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px' }}>
            {mensagemSucesso}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
              style={{ maxWidth: '320px', width: '100%' }}
            >
              {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
            </button>
          </div>
        </form>

        <p className="auth-alt-link" style={{ marginTop: '24px' }}>
          {isAuthenticated ? (
            <>
              Deseja retornar?{' '}
              <Link to="/minha-conta">Voltar para Minha Conta</Link>
            </>
          ) : (
            <>
              Lembrou sua senha?{' '}
              <Link to="/login">Voltar ao Login</Link>
            </>
          )}
        </p>
      </div>
    </MainLayout>
  );
}

