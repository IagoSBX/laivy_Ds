// Quadra de basquete (fundo da tela de Escalação). Marcação estática.
export default function QuadraEscalacao() {
  return (
    <svg className="quadra-svg" viewBox="0 0 600 336" xmlns="http://www.w3.org/2000/svg">
    {/* Piso */}
    <rect width="600" height="336" fill="#C68642" />
    {/* Faixas alternadas */}
    <rect x="0" y="0" width="600" height="48" fill="#B8763A" />
    <rect x="0" y="96" width="600" height="48" fill="#B8763A" />
    <rect x="0" y="192" width="600" height="48" fill="#B8763A" />
    <rect x="0" y="288" width="600" height="48" fill="#B8763A" />
    {/* Bordas da quadra */}
    <rect x="12" y="12" width="576" height="312" fill="none" stroke="white" strokeWidth="2.5" rx="4" />
    {/* Linha de meio */}
    <line x1="12" y1="168" x2="588" y2="168" stroke="white" strokeWidth="2.5" />
    {/* Círculo central */}
    <circle cx="300" cy="168" r="46" fill="none" stroke="white" strokeWidth="2.5" />
    <circle cx="300" cy="168" r="3" fill="white" />
   
    {/* ===== LADO ESQUERDO (defesa) ===== */}
    {/* Garrafão */}
    <rect x="12" y="96" width="152" height="144" fill="#A0622A" stroke="white" strokeWidth="2" opacity="0.7" />
    {/* Arco de lance livre */}
    <path d="M164,96 A72,72 0 0,1 164,240" fill="none" stroke="white" strokeWidth="2" />
    {/* Linhas horizontais do garrafão */}
    <line x1="12" y1="96" x2="164" y2="96" stroke="white" strokeWidth="2" />
    <line x1="12" y1="240" x2="164" y2="240" stroke="white" strokeWidth="2" />
    {/* Arco de 3 pontos esquerdo */}
    <path d="M12,60 L100,60 A132,132 0 0,1 100,276 L12,276" fill="none" stroke="white" strokeWidth="2" />
    {/* Ponto de lance livre */}
    <circle cx="164" cy="168" r="4" fill="white" />
    {/* Tabela */}
    <rect x="8" y="148" width="5" height="40" fill="white" />
    {/* Cesta */}
    <circle cx="56" cy="168" r="14" fill="none" stroke="#FF6600" strokeWidth="3" />
    <line x1="13" y1="168" x2="42" y2="168" stroke="white" strokeWidth="2" />
   
    {/* ===== LADO DIREITO (ataque) ===== */}
    {/* Garrafão */}
    <rect x="436" y="96" width="152" height="144" fill="#A0622A" stroke="white" strokeWidth="2" opacity="0.7" />
    {/* Arco de lance livre */}
    <path d="M436,96 A72,72 0 0,0 436,240" fill="none" stroke="white" strokeWidth="2" />
    {/* Linhas horizontais do garrafão */}
    <line x1="436" y1="96" x2="588" y2="96" stroke="white" strokeWidth="2" />
    <line x1="436" y1="240" x2="588" y2="240" stroke="white" strokeWidth="2" />
    {/* Arco de 3 pontos direito */}
    <path d="M588,60 L500,60 A132,132 0 0,0 500,276 L588,276" fill="none" stroke="white" strokeWidth="2" />
    {/* Ponto de lance livre */}
    <circle cx="436" cy="168" r="4" fill="white" />
    {/* Tabela */}
    <rect x="587" y="148" width="5" height="40" fill="white" />
    {/* Cesta */}
    <circle cx="544" cy="168" r="14" fill="none" stroke="#FF6600" strokeWidth="3" />
    <line x1="558" y1="168" x2="587" y2="168" stroke="white" strokeWidth="2" />
   
    {/* Labels */}
    <text x="80" y="30" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.4)" fontFamily="Barlow,sans-serif" fontWeight="700" letterSpacing="3">DEFESA</text>
    <text x="520" y="30" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.4)" fontFamily="Barlow,sans-serif" fontWeight="700" letterSpacing="3">ATAQUE</text>
    </svg>
   
  );
}
