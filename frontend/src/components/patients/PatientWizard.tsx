import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useClinicalHistory } from '../../hooks/usePatients';
import type { ClinicalHistory, Patient } from '../../hooks/usePatients';
import { WizardAccentContext, accentTokens } from './WizardAccentContext';
import ConsentStep from './ConsentStep';
import Step1Datos from './wizard/Step1Datos';
import Step2Motivo from './wizard/Step2Motivo';
import Step3Problema from './wizard/Step3Problema';
import Step4AntecPersonales from './wizard/Step4AntecPersonales';
import Step5AntecFamiliares from './wizard/Step5AntecFamiliares';
import Step6Biografia from './wizard/Step6Biografia';
import Step7ExamenMental from './wizard/Step7ExamenMental';
import Step8Diagnostico from './wizard/Step8Diagnostico';
import Step9Plan from './wizard/Step9Plan';

const STEPS = [
  'Consentimiento', 'Datos', 'Motivo', 'Problema', 'Antec. personales',
  'Antec. familiares', 'Biografía', 'Estado mental', 'Diagnóstico', 'Plan',
];

interface Props {
  patient: Patient;
  onClose: () => void;
  onPatientUpdate: (data: Partial<Patient>) => Promise<void>;
  accent?: string;
  isDark?: boolean;
}

export default function PatientWizard({ patient, onClose, onPatientUpdate, accent, isDark = true }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const { history, saveStep } = useClinicalHistory(patient.id);

  const tokens = accentTokens(accent ?? 'rgb(45,212,191)');

  // Adaptive theme vars
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

  const handleSave = async (stepIndex: number, data: Partial<ClinicalHistory>) => {
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
          width: '100%', maxWidth: 680, maxHeight: '90vh',
          background: modalBg,
          border: `1px solid ${modalBorder}`,
          borderRadius: 20, display: 'flex', flexDirection: 'column',
          boxShadow: modalShadow,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 16px 14px', borderBottom: `1px solid ${modalBorder}`, flexShrink: 0,
          }}>
            <div>
              <h2 style={{ color: h2Color, fontSize: 18, fontWeight: 700, margin: 0 }}>
                Historia Clínica — {patient.name}
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
            {STEPS.map((s, i) => {
              const locked = i > 0 && !patient.consentGivenAt;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button
                    className="btn-lift"
                    onClick={() => { if (!locked) setStep(i); }}
                    disabled={locked}
                    title={locked ? 'Registra el consentimiento primero' : s}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', border: 'none',
                      background: i === step ? tokens.savedColor : isCompleted(i) ? `${tokens.savedColor}33` : stepInactiveBg,
                      color: i === step ? '#fff' : isCompleted(i) ? tokens.savedColor : stepInactiveColor,
                      fontSize: 11, fontWeight: 700, cursor: locked ? 'not-allowed' : 'pointer',
                      opacity: locked ? 0.4 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s',
                    }}
                  >
                    {isCompleted(i) && i !== step ? <Check size={12} /> : i + 1}
                  </button>
                  {i < STEPS.length - 1 && (
                    <div style={{ width: 20, height: 1, background: isCompleted(i) ? `${tokens.savedColor}44` : connectorBg }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* step = wizard render index (shifts when a step is added); stepIndex = ClinicalHistory.completedSteps
                business index, fixed at 1-8 for Motivo..Plan — do not shift stepIndex when adding/removing wizard steps. */}
            {step === 0 && <ConsentStep patient={patient} onSave={onPatientUpdate} inp={inp} lbl={lbl} accent={accent} isDark={D} />}
            {step === 1 && <Step1Datos patient={patient} onSave={onPatientUpdate} inp={inp} lbl={lbl} accent={accent} isDark={D} />}
            {step === 2 && <Step2Motivo {...stepProps} stepIndex={1} />}
            {step === 3 && <Step3Problema {...stepProps} stepIndex={2} />}
            {step === 4 && <Step4AntecPersonales {...stepProps} stepIndex={3} />}
            {step === 5 && <Step5AntecFamiliares {...stepProps} stepIndex={4} />}
            {step === 6 && <Step6Biografia {...stepProps} stepIndex={5} />}
            {step === 7 && <Step7ExamenMental {...stepProps} stepIndex={6} />}
            {step === 8 && <Step8Diagnostico {...stepProps} stepIndex={7} />}
            {step === 9 && <Step9Plan {...stepProps} stepIndex={8} />}
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
            <button
              className="btn-lift"
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              disabled={step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                background: (step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)) ? nextDis : tokens.bg,
                border: 'none', borderRadius: 10,
                color: (step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)) ? nextDisColor : '#fff',
                fontSize: 14, fontWeight: 600,
                cursor: (step === STEPS.length - 1 || (step === 0 && !patient.consentGivenAt)) ? 'not-allowed' : 'pointer',
              }}
            >
              Siguiente <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </WizardAccentContext.Provider>,
    document.body
  );
}
