export default function LoadingSpinner({ size = 'md', text = '', color = '#c4953a' }) {
  const dim = size === 'sm' ? 20 : size === 'lg' ? 44 : 30;
  const stroke = size === 'sm' ? 2.5 : size === 'lg' ? 3.5 : 3;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: size === 'sm' ? '8px' : '32px 16px',
        gap: '12px',
        width: '100%',
      }}
    >
      <div
        style={{
          width: `${dim}px`,
          height: `${dim}px`,
          border: `${stroke}px solid rgba(0, 0, 0, 0.08)`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'salvSpin 0.75s linear infinite',
        }}
      />
      {text && (
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          {text}
        </span>
      )}
      <style>{`
        @keyframes salvSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

