import regularImg from '../../assets/medidas-regular-fit.png';
import oversizedImg from '../../assets/medidas-oversized.png';
import '../../styles/institucional.css';

export default function GuiaMedidasPage() {
  return (
    <div className="inst-page">
      <div className="inst-container guia-container">
        <h1 className="inst-title">GUIA DE MEDIDAS</h1>

        <section className="guia-section">
          <h2>REGULAR FIT</h2>
          <p>A camiseta tradicional (ou regular fit) é aquela peça projetada para seguir a anatomia do corpo de forma natural e sem sobras excessivas.</p>
          <p>Ajustada, mas não apertada, suas mangas terminam logo acima do cotovelo e comprimento abaixo da cintura.</p>
          <p>Nosso modelo tradicional é o pilar da praticidade, proporcionando leveza de forma discreta e equilibrada.</p>
          <img src={regularImg} alt="Medidas da camiseta Regular Fit" />
        </section>

        <section className="guia-section">
          <h2>OVERSIZED</h2>
          <p>Uma camiseta oversized é muito mais do que uma peça de "tamanho maior".</p>
          <p>Ela se caracteriza por uma modelagem mais ampla e solta, com ombros deslocados para baixo e mangas mais compridas (próximo ao cotovelo).</p>
          <p>Larga no corpo e caimento mais longo, sua estrutura "boxy" (quadrada) gera conforto e liberdade.</p>
          <img src={oversizedImg} alt="Medidas da camiseta Oversized" />
        </section>
      </div>
    </div>
  );
}
