import React from 'react';
import visaImg from '../assets/brands/visa.png';
import mastercardImg from '../assets/brands/mastercard.png';
import amexImg from '../assets/brands/amex.png';
import dinersImg from '../assets/brands/diners.png';
import auraImg from '../assets/brands/aura.png';
import eloImg from '../assets/brands/elo.png';
import hipercardImg from '../assets/brands/hipercard.png';
import discoverImg from '../assets/brands/discover.png';
import pixImg from '../assets/brands/pix.png';

export const BRAND_LOGOS = {
  visa: { src: visaImg, name: 'Visa' },
  mastercard: { src: mastercardImg, name: 'Mastercard' },
  master: { src: mastercardImg, name: 'Mastercard' },
  amex: { src: amexImg, name: 'American Express' },
  'american express': { src: amexImg, name: 'American Express' },
  diners: { src: dinersImg, name: 'Diners Club' },
  'diners club': { src: dinersImg, name: 'Diners Club' },
  aura: { src: auraImg, name: 'Aura' },
  elo: { src: eloImg, name: 'Elo' },
  hipercard: { src: hipercardImg, name: 'Hipercard' },
  hiper: { src: hipercardImg, name: 'Hipercard' },
  discover: { src: discoverImg, name: 'Discover' },
  pix: { src: pixImg, name: 'Pix' },
};

export const LISTA_BANDEIRAS_RODAPE = [
  { id: 'visa', name: 'Visa', src: visaImg },
  { id: 'mastercard', name: 'Mastercard', src: mastercardImg },
  { id: 'amex', name: 'American Express', src: amexImg },
  { id: 'diners', name: 'Diners Club', src: dinersImg },
  { id: 'elo', name: 'Elo', src: eloImg },
  { id: 'hipercard', name: 'Hipercard', src: hipercardImg },
  { id: 'aura', name: 'Aura', src: auraImg },
  { id: 'discover', name: 'Discover', src: discoverImg },
  { id: 'pix', name: 'Pix', src: pixImg },
];

/**
 * Detecta a bandeira a partir dos dígitos iniciais do cartão
 */
export function detectarBandeira(numero) {
  const limpo = (numero || '').replace(/\D/g, '');
  if (!limpo) return '';
  if (/^4/.test(limpo)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(limpo)) return 'mastercard';
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011|5090|650|651|655)/.test(limpo)) return 'elo';
  if (/^(34|37)/.test(limpo)) return 'amex';
  if (/^(606282|3841)/.test(limpo)) return 'hipercard';
  if (/^(30[0-5]|309|36|38|39)/.test(limpo)) return 'diners';
  if (/^(6011|65|64[4-9]|622)/.test(limpo)) return 'discover';
  if (/^50/.test(limpo)) return 'aura';
  return '';
}

export default function CardBrandIcon({
  brand,
  height = 22,
  className = '',
  style = {},
  withBackground = false,
}) {
  const chave = (brand || '').toLowerCase().trim();
  const info = BRAND_LOGOS[chave];

  if (!info) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          color: '#555',
          background: withBackground ? '#f3f4f6' : 'transparent',
          padding: withBackground ? '2px 6px' : '0',
          borderRadius: '4px',
          border: withBackground ? '1px solid #e5e7eb' : 'none',
          ...style,
        }}
      >
        💳 {brand || 'Cartão'}
      </span>
    );
  }

  const content = (
    <img
      src={info.src}
      alt={info.name}
      title={info.name}
      className={className}
      style={{
        height: `${height}px`,
        width: 'auto',
        maxWidth: '52px',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style,
      }}
    />
  );

  if (withBackground) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          borderRadius: '4px',
          padding: '3px 6px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          border: '1px solid #e5e7eb',
          height: `${height + 8}px`,
        }}
      >
        {content}
      </span>
    );
  }

  return content;
}

