// Paleta de cores padrão para roupas da Salv Sacra
export const CORES_PADRAO = [
  { nome: 'Preta',    hex: '#111111', borda: '#333333' },
  { nome: 'Branca',   hex: '#FFFFFF', borda: '#D1D5DB' },
  { nome: 'Off-White', hex: '#FAF9F6', borda: '#D1D5DB' },
  { nome: 'Bege',     hex: '#D7C4A5', borda: '#B39F80' },
  { nome: 'Marrom',   hex: '#5C4033', borda: '#3D281F' },
  { nome: 'Terracota', hex: '#C86D51', borda: '#9E4E35' },
  { nome: 'Caramelo', hex: '#C68642', borda: '#9E672E' },
  { nome: 'Verde Militar', hex: '#4B5320', borda: '#343B14' },
  { nome: 'Verde Oliva', hex: '#708238', borda: '#526027' },
  { nome: 'Azul Marinho', hex: '#1B2A4A', borda: '#0F1A30' },
  { nome: 'Azul Petróleo', hex: '#1E4D5F', borda: '#12323E' },
  { nome: 'Bordô / Vinho', hex: '#6B1D2F', borda: '#4A111F' },
  { nome: 'Cinza Mescla', hex: '#9E9E9E', borda: '#757575' },
  { nome: 'Chumbo',   hex: '#374151', borda: '#1F2937' },
];

/**
 * Retorna o código hexadecimal correspondente ao nome da cor.
 * Se não for encontrado exatamente, tenta busca parcial ou retorna um cinza neutro.
 */
export function getHexCor(nomeCor) {
  if (!nomeCor) return '#888888';
  const clean = nomeCor.trim().toLowerCase();
  const match = CORES_PADRAO.find((c) => c.nome.toLowerCase() === clean);
  if (match) return match.hex;

  // Busca por substring
  const sub = CORES_PADRAO.find((c) => clean.includes(c.nome.toLowerCase()) || c.nome.toLowerCase().includes(clean));
  if (sub) return sub.hex;

  // Fallbacks comuns
  if (clean.includes('pret')) return '#111111';
  if (clean.includes('branc')) return '#FFFFFF';
  if (clean.includes('beg')) return '#D7C4A5';
  if (clean.includes('marr')) return '#5C4033';
  if (clean.includes('azul')) return '#1B2A4A';
  if (clean.includes('verd')) return '#4B5320';
  if (clean.includes('cinz')) return '#9E9E9E';
  if (clean.includes('vinh') || clean.includes('bord')) return '#6B1D2F';

  return '#94A3B8';
}

