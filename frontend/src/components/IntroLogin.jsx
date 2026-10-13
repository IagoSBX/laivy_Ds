// Animação de abertura do login (quadra desenhada a giz). Marcação estática.
export default function IntroLogin() {
  return (
     <svg id="intro" viewBox="400 10 1120 1060" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
       {/* giz: o ruído "come" parte do traço (grão) e entorta a borda */}
       <filter id="giz" x="-2%" y="-2%" width="104%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="r" />
        <feColorMatrix in="r" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.6 1.75" result="grao" />
        <feComposite in="SourceGraphic" in2="grao" operator="in" result="s" />
        <feDisplacementMap in="s" in2="r" scale="4" />
       </filter>
       <marker id="seta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
        <path d="M0,0 L9,5 L0,10" fill="none" stroke="#00C97A" strokeWidth="1.4" />
       </marker>
       <marker id="bloqueio" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="12" markerHeight="12" orient="auto">
        <path d="M5,0 L5,10" stroke="#00C97A" strokeWidth=".9" />
       </marker>
       <mask id="m1" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><path className="rev" pathLength="1" style={{ '--t': '1.35s', '--d': '.45s' }} d="M968,812 L985,780 L1020,782 L1015,742 L1050,742 L1047,705 L1085,706 L1102,660" /></mask>
       <mask id="m2" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><path className="rev" pathLength="1" style={{ '--t': '1.85s', '--d': '.3s' }} d="M1112,650 L1280,604" /></mask>
       <mask id="m3" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><path className="rev" pathLength="1" style={{ '--t': '1.9s', '--d': '.35s' }} d="M1169,372 L1210,496" /></mask>
       <mask id="m4" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><path className="rev" pathLength="1" style={{ '--t': '2s', '--d': '.5s' }} d="M615,584 C645,470 730,320 868,238" /></mask>
       <mask id="m5" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><path className="rev" pathLength="1" style={{ '--t': '2.25s', '--d': '.4s' }} d="M1288,576 L902,254" /></mask>
       <mask id="m6" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="1080"><path className="rev" pathLength="1" style={{ '--t': '2.7s', '--d': '.35s' }} d="M880,232 C888,190 915,142 950,146" /></mask>
      </defs>
    
      <rect className="cartao" x="412" y="22" width="1096" height="1034" rx="28" />
    
      <g className="desenho" filter="url(#giz)">
       {/* quadra */}
       <rect className="linha" pathLength="1" style={{ '--i': '0' }} x="462" y="94" width="996" height="892" />
       <path className="linha" pathLength="1" style={{ '--i': '1' }} d="M504,94 L504,240 A465 465 0 0 0 1416,240 L1416,94" />
       <rect className="linha" pathLength="1" style={{ '--i': '2' }} x="794" y="94" width="332" height="394" />
       <circle className="linha" pathLength="1" style={{ '--i': '3' }} cx="960" cy="488" r="125" />
       <path className="linha" pathLength="1" style={{ '--i': '4' }} d="M835,986 A125 125 0 0 1 1085,986" />
       <line className="linha" pathLength="1" style={{ '--i': '5' }} x1="896" y1="124" x2="1024" y2="124" />
       <circle className="linha" pathLength="1" style={{ '--i': '6' }} cx="960" cy="148" r="24" />
    
       {/* defensores */}
       <g transform="translate(960,744)"><path className="def" style={{ '--i': '0' }} d="M-20,-20 L20,20 M20,-20 L-20,20" /></g>
       <g transform="translate(662,527)"><path className="def" style={{ '--i': '1' }} d="M-20,-20 L20,20 M20,-20 L-20,20" /></g>
       <g transform="translate(1256,527)"><path className="def" style={{ '--i': '2' }} d="M-20,-20 L20,20 M20,-20 L-20,20" /></g>
       <g transform="translate(822,247)"><path className="def" style={{ '--i': '3' }} d="M-20,-20 L20,20 M20,-20 L-20,20" /></g>
       <g transform="translate(1110,305)"><path className="def" style={{ '--i': '4' }} d="M-20,-20 L20,20 M20,-20 L-20,20" /></g>
    
       {/* jogada: drible do 1, passe p/ o 3, bloqueio do 5, corte do 2, passe p/ o 2, arremesso */}
       <path className="jogada" mask="url(#m1)" markerEnd="url(#seta)" d="M968,812 L985,780 L1020,782 L1015,742 L1050,742 L1047,705 L1085,706 L1102,660" />
       <path className="jogada passe" mask="url(#m2)" markerEnd="url(#seta)" d="M1112,650 L1280,604" />
       <path className="jogada" mask="url(#m3)" markerEnd="url(#bloqueio)" d="M1169,372 L1210,496" />
       <path className="jogada" mask="url(#m4)" markerEnd="url(#seta)" d="M615,584 C645,470 730,320 868,238" />
       <path className="jogada passe" mask="url(#m5)" markerEnd="url(#seta)" d="M1288,576 L902,254" />
       <path className="jogada arremesso" mask="url(#m6)" d="M880,232 C888,190 915,142 950,146" />
      </g>
    
      {/* cesta */}
      <circle className="cesta" cx="960" cy="148" r="22" />
      <circle className="onda" cx="960" cy="148" r="110" />
    
      {/* bola: drible → passe → passe → arremesso */}
      <circle r="12" fill="#FF6B1A" opacity="0">
       <set attributeName="opacity" to="1" begin="1.3s" />
       <set attributeName="opacity" to="0" begin="3.05s" />
       <animateMotion begin="1.3s" dur="1.75s" fill="freeze" calcMode="linear" path="M960,800 L1100,660 L1290,600 L910,262 Q900,170 958,148" keyTimes="0;.286;.343;.486;.571;.771;.8;1" keyPoints="0;.19;.19;.38;.38;.87;.87;1" />
      </circle>
    
      {/* jogadores (--x/--y = caminho até o ponto onde nasce o "L") */}
      <g filter="url(#giz)">
      <g className="jog" style={{ '--i': '0', '--x': '0', '--y': '-279' }}><circle cx="960" cy="824" r="32" /></g>
      <g className="jog" style={{ '--i': '1', '--x': '348', '--y': '-46' }}><circle cx="612" cy="591" r="32" /></g>
      <g className="jog" style={{ '--i': '2', '--x': '-346', '--y': '-46' }}><circle cx="1306" cy="591" r="32" /></g>
      <g className="jog" style={{ '--i': '3', '--x': '203', '--y': '249' }}><circle cx="757" cy="296" r="32" /></g>
      <g className="jog" style={{ '--i': '4', '--x': '-207', '--y': '182' }}><circle cx="1167" cy="363" r="32" /></g>
      </g>
     </svg>
    
  );
}
