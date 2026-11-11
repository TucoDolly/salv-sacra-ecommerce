import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary capturou um erro:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '8px', margin: '20px', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#991b1b', marginTop: 0 }}>Ops! Ocorreu um erro ao carregar a página:</h2>
          <pre style={{ background: '#fee2e2', padding: '16px', borderRadius: '6px', color: '#7f1d1d', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.toString()}
          </pre>
          <details style={{ marginTop: '12px', whiteSpace: 'pre-wrap', color: '#374151', fontSize: '12px' }} open>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Component Stack Trace</summary>
            {this.state.errorInfo?.componentStack}
          </details>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '10px 18px', background: '#991b1b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Recarregar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

