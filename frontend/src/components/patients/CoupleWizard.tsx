import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useClinicalHistoryCouple } from '../../hooks/usePatients';
import type { ClinicalHistoryCouple, Patient } from '../../hooks/usePatients';
import { WizardAccentContext, accentTokens } from './WizardAccentContext';
import StepC1Datos from './couple-wizard/StepC1Datos';
import StepC2Motivo from './couple-wizard/StepC2Motivo';
import StepC3Historia from './couple-wizard/StepC3Historia';
import StepC4Conflicto from './couple-wizard/StepC4Conflicto';
import StepC5Intimidad from './couple-wizard/StepC5Intimidad';
import StepC6Familia from './couple-wizard/StepC6Familia';
import StepC7Recursos from './couple-wizard/StepC7Recursos';
import StepC8Evaluacion from './couple-wizard/StepC8Evaluacion';
import StepC9Plan from './couple-wizard/StepC9Plan';

const STEPS = [
  'Datos', 'Motivo', 'Historia', 'Conflicto',
  'Intimidad', 'Familia', 'Recursos', 'Evaluación', 'Plan',
];

interface Props {
  patient: Patient;
  onClose: () => void;
  accent?: string;
  isDark?: boolean;
}

export default function CoupleWizard({ patient, onClose, accent, isDark = true }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const { history, saveStep } = useClinicalHistoryCouple(patient.id);

  const tokens = accentTokens(accent ?? 'rgb(45,212,191)');

  const D = isDark;
  const modalBg       = D ? tokens.modalBg : tokens.modalBgLight;
  const modalBorder   = D ? tokens.border : tokens.borderFocus;
  const modalShadow   = D ? '0 24px 80px rgba(0,0,0,0.7)' : '0 8px 40px rgba(0,0,0,0.12)';
  const h2Color       = D ? '#e8f0f0' : '#1a1a2e';
  const stepInactiveBg    = D ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const stepInactiveColor = D ? '#6aada8' : 'rgba(0,0,0,0.35)';
  const connectorBg   = D ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const prevBg        = D ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.04)';
  const prevBorder    = D ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)';
  const counterColor  = D ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.4)';
  const nextDis       = D ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';
  const nextDisColor  = D ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    background: D ? 'rgba(255,255,255,0.11)' : 'white',
    border: `1px solid ${D ? 'rgba(45,212,191,0.45)' : 'rgba(0,0,0,0.15)'}`,
    color: D ? '#e8f0f0' : '#1a1a2e', fontSize: 14, fontFamily: 'DM Sans, sans-serif',
    outline: 'none', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    fontSize: 12, color: D ? 'rgba(255,255,255,0.95)' : tokens.lblColor, textTransform: 'uppercase',
    letterSpacing: '0.8px', fontWeight: 700, display: 'block', marginBottom: 6,
  };
  const ta: React.CSSProperties = { ...inp, resize: 'vertical', minHeight: 80 };

  const handleSave = async (stepIndex: number, data: Partial<ClinicalHistoryCouple>) => {
    setSaving(true);
    try { await saveStep(stepIndex, data); } finally { setSaving(false); }
  };

  const stepProps = { inp, lbl, ta, history, onSave: handleSave, saving, isDark: D };
  const isCompleted = (i: number) => history?.completedSteps?.includes(i) ?? false;

  return createPortal(
    <WizardAccentContext.Provider value={tokens}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}>
        <div style={{
          width: '100%', maxWidth: 700, maxHeight: '90vh',
          background: modalBg,
          border: `1px solid ${modalBorder}`,
          borderRadius: 20, display: 'flex', flexDirection: 'column',
          boxShadow: modalShadow,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px', borderBottom: `1px solid ${modalBorder}`, flexShrink: 0,
          }}>
            <div>
              <h2 style={{ color: h2Color, fontSize: 18, fontWeight: 700, margin: 0 }}>
                Historia Clínica de Pareja — {patient.name}
              </h2>
              <p style={{ color: tokens.lblColor, fontSize: 12, margin: '4px 0 0' }}>
                Paso {step + 1} de {STEPS.length}: {STEPS[step]}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tokens.lblColor, padding: 6, borderRadius: 8 }}>
              <X size={20} />
            </button>
          </div>

          {/* Stepper */}
          <div style={{
            display: 'flex', alignItems: 'center', padding: '10px 14px',
            borderBottom: `1px solid ${modalBorder}`, gap: 4, flexShrink: 0, overflowX: 'auto',
          }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <button className="btn-lift" onClick={() => setStep(i)} title={s} style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none',
                  background: i === step ? tokens.savedColor : isCompleted(i) ? `${tokens.savedColor}33` : stepInactiveBg,
                  color: i === step ? '#fff' : isCompleted(i) ? tokens.savedColor : stepInactiveColor,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
                }}>
                  {isCompleted(i) && i !== step ? <Check size={12} /> : i + 1}
                </button>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 20, height: 1, background: isCompleted(i) ? `${tokens.savedColor}44` : connectorBg }} />
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {step === 0 && <StepC1Datos {...stepProps} stepIndex={0} />}
            {step === 1 && <StepC2Motivo {...stepProps} stepIndex={1} />}
            {step === 2 && <StepC3Historia {...stepProps} stepIndex={2} />}
            {step === 3 && <StepC4Conflicto {...stepProps} stepIndex={3} />}
            {step === 4 && <StepC5Intimidad {...stepProps} stepIndex={4} />}
            {step === 5 && <StepC6Familia {...stepProps} stepIndex={5} />}
            {step === 6 && <StepC7Recursos {...stepProps} stepIndex={6} />}
            {step === 7 && <StepC8Evaluacion {...stepProps} stepIndex={7} />}
            {step === 8 && <StepC9Plan {...stepProps} stepIndex={8} />}
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px', borderTop: `1px solid ${modalBorder}`, flexShrink: 0,
          }}>
            <button className="btn-lift" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              background: prevBg, border: `1px solid ${prevBorder}`,
              borderRadius: 10, color: tokens.lblColor, fontSize: 14,
              cursor: step === 0 ? 'not-allowed' : 'pointer', opacity: step === 0 ? 0.4 : 1,
            }}>
              <ChevronLeft size={16} /> Anterior
            </button>
            <span style={{ color: counterColor, fontSize: 12 }}>
              {history?.completedSteps?.length ?? 0} / {STEPS.length} completados
            </span>
            <button className="btn-lift" onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              background: step === STEPS.length - 1 ? nextDis : tokens.bg,
              border: 'none', borderRadius: 10,
              color: step === STEPS.length - 1 ? nextDisColor : '#fff',
              fontSize: 14, fontWeight: 600, cursor: step === STEPS.length - 1 ? 'not-allowed' : 'pointer',
            }}>
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </WizardAccentContext.Provider>,
    document.body
  );
}
