import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  maritalStatus?: string;
  education?: string;
  occupation?: string;
  city?: string;
  country?: string;
  emergencyContact?: string;
  referralSource?: string;
  notes?: string;
  createdAt: string;
  clinicalHistory?: { completedSteps: number[] } | null;
  clinicalHistoryCouple?: { completedSteps: number[] } | null;
  sessionNotes?: { id: string }[];
}

export interface ClinicalHistory {
  id?: string;
  clientId?: string;
  completedSteps: number[];
  chiefComplaint?: string; symptomDuration?: string; triggerFactors?: string;
  currentProblem?: string; onsetCourse?: string; currentSymptoms?: string; previousTreatments?: string;
  medicalHistory?: string; psychiatricHistory?: string; currentMedication?: string;
  hospitalizations?: string; substanceUse?: string;
  familyComposition?: string; familyRelations?: string; familyPsychHistory?: string; familyEvents?: string;
  childhoodHistory?: string; schoolHistory?: string; workHistory?: string;
  relationshipHistory?: string; traumaticEvents?: string;
  appearance?: string; mood?: string; affect?: string; thought?: string;
  perception?: string; memory?: string; attention?: string; judgment?: string; insight?: string;
  provisionalDiagnosis?: string; diagnosticCode?: string; differentialDiagnosis?: string;
  therapeuticGoals?: string; therapeuticApproach?: string; sessionFrequency?: string;
  estimatedDuration?: string; referrals?: string;
}

export interface SessionNote {
  id: string;
  clientId: string;
  sessionNumber: number;
  sessionDate: string;
  noteType?: string;
  summary?: string;
  topics?: string;
  homework?: string;
  observations?: string;
  nextPlan?: string;
  createdAt: string;
}

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/clients');
      setPatients(res.data);
    } catch { setPatients([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createPatient = async (data: Partial<Patient>) => {
    const res = await api.post('/clients', data);
    await load();
    return res.data as Patient;
  };

  const updatePatient = async (id: string, data: Partial<Patient>) => {
    const res = await api.patch(`/clients/${id}`, data);
    await load();
    return res.data as Patient;
  };

  const deletePatient = async (id: string) => {
    await api.delete(`/clients/${id}`);
    await load();
  };

  return { patients, loading, load, createPatient, updatePatient, deletePatient };
}

export function useClinicalHistory(clientId: string | null) {
  const [history, setHistory] = useState<ClinicalHistory | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await api.get(`/clinical-history/${clientId}`);
      setHistory(res.data ?? { completedSteps: [] });
    } catch { setHistory({ completedSteps: [] }); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const saveStep = async (stepIndex: number, data: Partial<ClinicalHistory>) => {
    if (!clientId) return;
    const completedSteps = history?.completedSteps ?? [];
    const newCompleted = completedSteps.includes(stepIndex)
      ? completedSteps
      : [...completedSteps, stepIndex];
    const res = await api.put(`/clinical-history/${clientId}`, { ...data, completedSteps: newCompleted });
    setHistory(res.data);
  };

  return { history, loading, saveStep, reload: load };
}

export interface ClinicalHistoryCouple {
  id?: string; clientId?: string; completedSteps: number[];
  p1Name?: string; p1Age?: string; p1Occupation?: string; p1Education?: string;
  p2Name?: string; p2Age?: string; p2Occupation?: string; p2Education?: string;
  relationshipStatus?: string; timeTogether?: string; children?: string;
  chiefComplaint?: string; whoInitiated?: string; problemDuration?: string; therapyExpectations?: string;
  howTheyMet?: string; courtshipHistory?: string; significantEvents?: string; crisisPoints?: string;
  mainConflictTopics?: string; communicationStyle?: string; negativeCycle?: string; conflictResolution?: string;
  emotionalIntimacy?: string; sexualLife?: string; positiveConnection?: string;
  p1FamilyModel?: string; p2FamilyModel?: string; transgenerational?: string;
  previousTherapy?: string; solutionAttempts?: string; coupleStrengths?: string;
  p1Commitment?: string; p2Commitment?: string; violenceRisk?: string;
  infidelityHistory?: string; substanceUse?: string; individualMH?: string;
  therapeuticGoals?: string; therapeuticApproach?: string; sessionModality?: string;
  sessionFrequency?: string; estimatedDuration?: string;
}

export function useClinicalHistoryCouple(clientId: string | null) {
  const [history, setHistory] = useState<ClinicalHistoryCouple | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await api.get(`/clinical-history-couple/${clientId}`);
      setHistory(res.data ?? { completedSteps: [] });
    } catch { setHistory({ completedSteps: [] }); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const saveStep = async (stepIndex: number, data: Partial<ClinicalHistoryCouple>) => {
    if (!clientId) return;
    const completedSteps = history?.completedSteps ?? [];
    const newCompleted = completedSteps.includes(stepIndex) ? completedSteps : [...completedSteps, stepIndex];
    const res = await api.put(`/clinical-history-couple/${clientId}`, { ...data, completedSteps: newCompleted });
    setHistory(res.data);
  };

  return { history, loading, saveStep, reload: load };
}

export function useSessionNotes(clientId: string | null) {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await api.get(`/session-notes/${clientId}`);
      setNotes(res.data);
    } catch { setNotes([]); }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const addNote = async (data: Partial<SessionNote>) => {
    if (!clientId) return;
    await api.post(`/session-notes/${clientId}`, data);
    await load();
  };

  const updateNote = async (noteId: string, data: Partial<SessionNote>) => {
    await api.patch(`/session-notes/note/${noteId}`, data);
    await load();
  };

  const deleteNote = async (noteId: string) => {
    await api.delete(`/session-notes/note/${noteId}`);
    await load();
  };

  return { notes, loading, addNote, updateNote, deleteNote };
}
