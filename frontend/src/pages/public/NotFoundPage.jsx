import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: '65vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 100%)',
      }}
    >
      <div
        style={{
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
          background: '#ffffff',
          border: '1px solid #f1f5f9',
          borderRadius: '16px',
          padding: '48px 36px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.05)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: '#b45309',
            background: '#fef3c7',
            padding: '4px 12px',
            borderRadius: '999px',
            marginBottom: '18px',
          }}
        >
          Erro 404 · Não Encontrado
        </span>

        <h1
          style={{
            fontSize: '72px',
            fontWeight: 900,
            letterSpacing: '-2px',
            color: '#0f172a',
            margin: '0 0 8px 0',
            lineHeight: 1,
            fontFamily: 'serif',
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1e293b',
            margin: '0 0 12px 0',
          }}
        >
          Esta página parece ter se perdido pelo caminho
        </h2>

        <p
          style={{
            fontSize: '14.5px',
            color: '#64748b',
            lineHeight: 1.6,
            marginBottom: '32px',
          }}
        >
          O endereço que você tentou acessar não existe, foi alterado ou está temporariamente indisponível. Que tal continuar explorando nossas coleções?
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'stretch',
            maxWidth: '380px',
            margin: '0 auto',
          }}
        >
          <Link
            to="/produtos"
            style={{
              background: '#0f172a',
              color: '#ffffff',
              padding: '13px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background 0.2s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#1e293b'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#0f172a'; }}
          >
            👕 Ver Catálogo de Produtos
          </Link>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/"
              style={{
                flex: 1,
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #e2e8f0',
                padding: '11px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            >
              ← Página Inicial
            </Link>

            <Link
              to="/contato"
              style={{
                flex: 1,
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #e2e8f0',
                padding: '11px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
            >
              💬 Fale Conosco
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

