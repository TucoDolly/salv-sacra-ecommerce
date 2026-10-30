import { useRef, useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import api from '../../services/api';
import '../../styles/institucional.css';

// Sem VITE_RECAPTCHA_SITE_KEY no .env usa a chave de TESTE do Google (sempre passa)
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

export default function ContatoPage() {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', mensagem: '' });
  const [token, setToken] = useState(null);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const captchaRef = useRef(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    setErro('');
    setEnviando(true);
    try {
      await api.post('/contato', { ...form, recaptcha: token });
      setEnviado(true);
      setForm({ nome: '', email: '', telefone: '', mensagem: '' });
    } catch (err) {
      setEnviado(false);
      setErro(err.response?.data?.message || 'Não foi possível enviar. Tente novamente.');
    } finally {
      captchaRef.current?.reset();
      setToken(null);
      setEnviando(false);
    }
  };

  const pronto = token && form.nome && form.email && form.mensagem && !enviando;

  return (
    <div className="inst-page">
      <div className="inst-container">
        <h1 className="inst-title inst-title-left">Contato</h1>

        <div className="contato-layout">
          <div className="contato-info">
            <p className="contato-horario">Atendimento de segunda a sexta das 9h às 19h.</p>
            <ul>
              <li><span>📱</span> 5548996205153</li>
              <li><span>📞</span> 48996205153</li>
              <li><span>✉️</span> salvsacra2@gmail.com</li>
              <li><span>📍</span> Rua Manoel Antunes Corrêa, 2171</li>
            </ul>
          </div>

          <form className="contato-form" onSubmit={handleSubmit}>
            <label htmlFor="nome">Nome completo</label>
            <input id="nome" name="nome" value={form.nome} onChange={handleChange} required />

            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />

            <label htmlFor="telefone">Telefone</label>
            <input id="telefone" name="telefone" value={form.telefone} onChange={handleChange} />

            <label htmlFor="mensagem">Mensagem</label>
            <textarea id="mensagem" name="mensagem" rows="5" value={form.mensagem} onChange={handleChange} required />

            <div className="contato-captcha">
              <ReCAPTCHA ref={captchaRef} sitekey={SITE_KEY} onChange={setToken} onExpired={() => setToken(null)} />
            </div>

            <button type="submit" className="contato-btn" disabled={!pronto}>{enviando ? 'Enviando…' : 'Enviar'}</button>
            {enviado && <p className="contato-ok">Mensagem enviada! Responderemos em breve.</p>}
            {erro && <p className="contato-ok" style={{ color: '#c62828' }}>{erro}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
