import { Lock } from 'lucide-react';

interface ProGateProps {
  isPro: boolean;
  children: React.ReactNode;
  display?: React.CSSProperties['display'];
  /** Compact: smaller lock icon for tiny elements like color circles */
  compact?: boolean;
}

export default function ProGate({ isPro, children, display = 'block', compact = false }: ProGateProps) {
  if (isPro) return <>{children}</>;

  return (
    <div style={{ position: 'relative', display }}>
      {/* Dimmed content — non-interactive */}
      <div style={{ opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>

      {/* Lock icon centered over element */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        width: compact ? 16 : 26,
        height: compact ? 16 : 26,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.52)',
        border: compact ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(3px)',
      }}>
        <Lock size={compact ? 8 : 12} color="white" strokeWidth={2.5} />
      </div>
    </div>
  );
}
