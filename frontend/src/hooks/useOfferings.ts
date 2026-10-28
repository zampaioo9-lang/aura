import { useState, useCallback } from 'react';
import api from '../api/client';

export interface QuestionOption {
  id: string;
  label: string;
  value: number;
}

export interface Question {
  id: string;
  moduleId: string;
  order: number;
  text: string;
  type: 'FREE_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  options: QuestionOption[];
}

export interface ScoringRule {
  id: string;
  moduleId: string;
  minScore: number;
  maxScore: number;
  message: string;
}

export interface Module {
  id: string;
  offeringId: string;
  order: number;
  title: string;
  description: string | null;
  type: 'TEXT' | 'VIDEO' | 'PDF' | 'QUESTIONNAIRE';
  textContent: string | null;
  fileUrl: string | null;
  createdAt: string;
}

export interface Offering {
  id: string;
  profileId: string;
  type: 'LIVE_WORKSHOP' | 'RECORDED_COURSE';
  title: string;
  description: string | null;
  coverImage: string | null;
  priceUSD: string;
  priceMXN: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  scheduledAt: string | null;
  capacity: number | null;
  externalLink: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { modules: number; purchases: number };
}

export interface CreateOfferingData {
  profileId: string;
  type: 'LIVE_WORKSHOP' | 'RECORDED_COURSE';
  title: string;
  description?: string;
  coverImage?: string;
  priceUSD: number;
  priceMXN?: number;
  scheduledAt?: string;
  capacity?: number;
  externalLink?: string;
}

export interface UpdateOfferingData {
  title?: string;
  description?: string;
  coverImage?: string;
  priceUSD?: number;
  priceMXN?: number | null;
  scheduledAt?: string | null;
  capacity?: number | null;
  externalLink?: string | null;
}

export interface CreateModuleData {
  title: string;
  description?: string;
  type: 'TEXT' | 'VIDEO' | 'PDF' | 'QUESTIONNAIRE';
  textContent?: string;
  fileUrl?: string;
}

export interface UpdateModuleData {
  title?: string;
  description?: string;
  textContent?: string;
  fileUrl?: string;
  order?: number;
}

export interface CreateQuestionData {
  text: string;
  type: 'FREE_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  options?: { label: string; value: number }[];
}

export interface ScoringRuleData {
  minScore: number;
  maxScore: number;
  message: string;
}

function errorMessage(err: any, fallback: string): string {
  return err.response?.data?.error || fallback;
}

// NO auto-carga al montarse (a diferencia de useServices.ts): este hook se usa tanto en
// TalleresCursos.tsx (que permanece montado todo el tiempo, oculto con display:none, nunca
// desmontado -- mismo patron que Pacientes) como dentro de QuestionnaireEditor.tsx (que se
// monta/desmonta cada vez que se abre/cierra el modal de un modulo QUESTIONNAIRE). Si este
// hook se auto-cargara en su propio useEffect, TalleresCursos dispararia un GET /offerings/me
// apenas el Dashboard carga -- sin que el profesional haya entrado a la pestaña -- y cada
// apertura de QuestionnaireEditor dispararia otro de mas. En su lugar, cada consumidor decide
// cuando llamar fetchOfferings() explicitamente (TalleresCursos ya lo hace, gateado por
// `isActive`; QuestionnaireEditor nunca necesita la lista de offerings, solo las funciones).
export function useOfferings() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOfferings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/offerings/me');
      setOfferings(res.data);
      setError(null);
    } catch (err: any) {
      setError(errorMessage(err, 'Error al cargar tus ofertas'));
    } finally {
      setLoading(false);
    }
  }, []);

  const createOffering = async (data: CreateOfferingData): Promise<Offering> => {
    try {
      const res = await api.post('/offerings', data);
      await fetchOfferings();
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al crear la oferta'));
    }
  };

  const updateOffering = async (id: string, data: UpdateOfferingData): Promise<Offering> => {
    try {
      const res = await api.put(`/offerings/${id}`, data);
      await fetchOfferings();
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar la oferta'));
    }
  };

  const togglePublish = async (id: string): Promise<Offering> => {
    try {
      const res = await api.patch(`/offerings/${id}/publish`);
      await fetchOfferings();
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al publicar/despublicar la oferta'));
    }
  };

  const archiveOffering = async (id: string): Promise<void> => {
    try {
      await api.delete(`/offerings/${id}`);
      await fetchOfferings();
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al archivar la oferta'));
    }
  };

  const fetchModules = async (offeringId: string): Promise<Module[]> => {
    const res = await api.get(`/offerings/${offeringId}/modules`);
    return res.data;
  };

  const createModule = async (offeringId: string, data: CreateModuleData): Promise<Module> => {
    try {
      const res = await api.post(`/offerings/${offeringId}/modules`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al crear el modulo'));
    }
  };

  const updateModule = async (offeringId: string, moduleId: string, data: UpdateModuleData): Promise<Module> => {
    try {
      const res = await api.put(`/offerings/${offeringId}/modules/${moduleId}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar el modulo'));
    }
  };

  const deleteModule = async (offeringId: string, moduleId: string): Promise<void> => {
    try {
      await api.delete(`/offerings/${offeringId}/modules/${moduleId}`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al eliminar el modulo'));
    }
  };

  const fetchQuestions = async (offeringId: string, moduleId: string): Promise<Question[]> => {
    const res = await api.get(`/offerings/${offeringId}/modules/${moduleId}/questions`);
    return res.data;
  };

  const createQuestion = async (offeringId: string, moduleId: string, data: CreateQuestionData): Promise<Question> => {
    try {
      const res = await api.post(`/offerings/${offeringId}/modules/${moduleId}/questions`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al crear la pregunta'));
    }
  };

  const updateQuestionText = async (offeringId: string, moduleId: string, questionId: string, text: string): Promise<Question> => {
    try {
      const res = await api.put(`/offerings/${offeringId}/modules/${moduleId}/questions/${questionId}`, { text });
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar la pregunta'));
    }
  };

  const deleteQuestion = async (offeringId: string, moduleId: string, questionId: string): Promise<void> => {
    try {
      await api.delete(`/offerings/${offeringId}/modules/${moduleId}/questions/${questionId}`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al eliminar la pregunta'));
    }
  };

  const fetchScoringRules = async (offeringId: string, moduleId: string): Promise<ScoringRule[]> => {
    const res = await api.get(`/offerings/${offeringId}/modules/${moduleId}/scoring-rules`);
    return res.data;
  };

  const createScoringRule = async (offeringId: string, moduleId: string, data: ScoringRuleData): Promise<ScoringRule> => {
    try {
      const res = await api.post(`/offerings/${offeringId}/modules/${moduleId}/scoring-rules`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al crear la regla de puntaje'));
    }
  };

  const updateScoringRule = async (offeringId: string, moduleId: string, ruleId: string, data: ScoringRuleData): Promise<ScoringRule> => {
    try {
      const res = await api.put(`/offerings/${offeringId}/modules/${moduleId}/scoring-rules/${ruleId}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar la regla de puntaje'));
    }
  };

  const deleteScoringRule = async (offeringId: string, moduleId: string, ruleId: string): Promise<void> => {
    try {
      await api.delete(`/offerings/${offeringId}/modules/${moduleId}/scoring-rules/${ruleId}`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al eliminar la regla de puntaje'));
    }
  };

  return {
    offerings, loading, error, setError, fetchOfferings,
    createOffering, updateOffering, togglePublish, archiveOffering,
    fetchModules, createModule, updateModule, deleteModule,
    fetchQuestions, createQuestion, updateQuestionText, deleteQuestion,
    fetchScoringRules, createScoringRule, updateScoringRule, deleteScoringRule,
  };
}
