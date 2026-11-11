import React from 'react';
import pixImg from '../assets/pix-icon.png';

/**
 * Ícone Oficial do PIX fornecido pelo usuário (Imagem 3)
 */
export default function IconPix({ size = 18, className = '', style = {} }) {
  return (
    <img
      src={pixImg}
      alt="Pix"
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
