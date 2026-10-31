import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { verificarEmail, reenviarValidacao } from '../services/authService';
import MainLayout from '../layouts/MainLayout';
import '../styles/auth.css';

const BREADCRUMBS = [
  { label: 'Início', to: '/' },
  { label: 'Minha Conta', to: '/login' },
  { label: 'Validação de E-mail' },
];

export default function VerificarEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const { setSession } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState('processando'); // 'processando' | 'sucesso' | 'erro'
  const [mensagem, setMensagem] = useState('');
  const [reenviando, setReenviando] = useState(false);
  const [msgReenvio, setMsgReenvio] = useState('');
  const executadoRef = useRef(false);

  useEffect(() => {
    if (!token || !email) {
      setStatus('erro');
      setMensagem('Link de validação incompleto ou inválido.');
      return;
    }

    if (executadoRef.current) return;
    executadoRef.current = true;

    verificarEmail({ email, token })
      .then((res) => {
        setStatus('sucesso');
        setMensagem(res.data.message || 'E-mail validado com sucesso! Sua conta está ativa.');
        if (res.data.token && res.data.user) {
          setSession(res.data.token, res.data.user);
        }
      })
      .catch((err) => {
        setStatus('erro');
        setMensagem(err.response?.data?.message || 'Não foi possível validar seu e-mail. O link pode ter expirado.');
      });
  }, [token, email, setSession]);

  const handleReenviar = async () => {
    if (!email) return;
    setReenviando(true);
    setMsgReenvio('');
    try {
      const res = await reenviarValidacao({ email });
      setMsgReenvio(res.data.message || 'Novo link enviado com sucesso!');
    } catch (err) {
      setMsgReenvio(err.response?.data?.message || 'Erro ao reenviar link.');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <MainLayout breadcrumbs={BREADCRUMBS}>
      <div className="auth-page">
        <div className="auth-confirmation-card" style={{ maxWidth: 520, margin: '40px auto' }}>
          {status === 'processando' && (
            <>
              <h2 style={{ marginTop: 10 }}>Validando seu e-mail...</h2>
              <p style={{ color: '#666', marginTop: 12 }}>
                Por favor, aguarde enquanto confirmamos a ativação da sua conta.
              </p>
            </>
          )}

          {status === 'sucesso' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h2>Conta ativada com sucesso!</h2>
              <p style={{ color: '#444', margin: '14px 0 24px' }}>{mensagem}</p>
              <button
                type="button"
                className="auth-btn"
                style={{ maxWidth: 280, margin: '0 auto' }}
                onClick={() => navigate('/minha-conta')}
              >
                Acessar Minha Conta
              </button>
            </>
          )}

          {status === 'erro' && (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h2>Não foi possível ativar sua conta</h2>
              <p style={{ color: '#c0392b', margin: '14px 0 24px', fontWeight: 500 }}>{mensagem}</p>

              {email && (
                <div style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    className="auth-btn"
                    disabled={reenviando}
                    style={{ maxWidth: 280, margin: '0 auto' }}
                    onClick={handleReenviar}
                  >
                    {reenviando ? 'Enviando...' : 'Reenviar link de validação'}
                  </button>
                  {msgReenvio && (
                    <p style={{ marginTop: 12, fontSize: 13, color: '#27ae60', fontWeight: 600 }}>{msgReenvio}</p>
                  )}
                </div>
              )}

              <p className="auth-alt-link" style={{ marginTop: 24 }}>
                <Link to="/cadastro">Tentar se cadastrar novamente</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

