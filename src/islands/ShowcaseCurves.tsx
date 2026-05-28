export default function ShowcaseCurves() {
  return (
    <div style={{
      position: 'absolute', inset: 0, 'z-index': 0,
      'pointer-events': 'none', background: '#EDE9FE', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '45%', left: '3%',
        width: '280px', height: '280px',
        background: 'radial-gradient(circle, #FF3355bb 0%, #FF335544 35%, transparent 70%)',
        filter: 'blur(25px)',
        animation: 'orb 5s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '14%', right: '12%',
        width: '260px', height: '260px',
        background: 'radial-gradient(circle, #8A38F5aa 0%, #8A38F544 40%, transparent 70%)',
        filter: 'blur(25px)',
        animation: 'orb 6s ease-in-out 2s infinite',
      }} />
      <div style={{
        position: 'absolute', top: '66%', left: '22%',
        width: '240px', height: '240px',
        background: 'radial-gradient(circle, #864AFFbb 0%, #864AFF44 40%, transparent 70%)',
        filter: 'blur(25px)',
        animation: 'orb 7s ease-in-out 4s infinite',
      }} />

      <svg xmlns="http://www.w3.org/2000/svg"
        style="position:absolute;inset:0;width:100%;height:100%">
        <defs>
          <filter id="g">
            <feGaussianBlur stdDeviation="2" result="a" />
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="a" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <line x1="25%" y1="-5%" x2="25%" y2="105%" stroke="#864AFF" stroke-width="1.5" filter="url(#g)" />
        <line x1="50%" y1="-5%" x2="50%" y2="105%" stroke="#FF3355" stroke-width="1.5" filter="url(#g)" />
        <line x1="75%" y1="-5%" x2="75%" y2="105%" stroke="#8A38F5" stroke-width="1.5" filter="url(#g)" />

        <path fill="none" stroke="#A197DD" stroke-width="1" filter="url(#g)" opacity="0.5">
          <animate attributeName="d"
            values="M 0 30% Q 30% 25%, 55% 33% T 100% 28%;M 0 35% Q 30% 40%, 55% 30% T 100% 36%;M 0 30% Q 30% 25%, 55% 33% T 100% 28%"
            dur="14s" repeatCount="indefinite" />
        </path>
        <path fill="none" stroke="#CAC3F7" stroke-width="0.8" filter="url(#g)" opacity="0.4">
          <animate attributeName="d"
            values="M 0 70% Q 30% 75%, 55% 66% T 100% 72%;M 0 65% Q 30% 60%, 55% 70% T 100% 64%;M 0 70% Q 30% 75%, 55% 66% T 100% 72%"
            dur="16s" repeatCount="indefinite" />
        </path>
      </svg>

      <style>{`
        @keyframes orb {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
