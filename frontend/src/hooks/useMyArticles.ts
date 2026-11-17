import { useCallback } from 'react';
import api from '../api/client';
import type { Article, ArticleBlock, CreateArticleBlockData, UpdateArticleBlockData } from './useArticles';

// Lo que devuelve GET /my-articles (lista, sin bloques)
export type MyArticleSummary = Pick<
  Article,
  'id' | 'slug' | 'title' | 'excerpt' | 'status' | 'reviewNote' | 'submittedAt' | 'publishedAt' | 'updatedAt' | 'coverImage'
>;

export interface CreateMyArticleData {
  title: string; excerpt?: string; metaDescription?: string; coverImage?: string;
}
export interface UpdateMyArticleData {
  title?: string; excerpt?: string; metaDescription?: string; coverImage?: string;
}

// Muestra el mensaje real del backend; solo si no hay ninguno usa el generico.
function errorMessage(err: any, fallback: string): string {
  return err.response?.data?.error || fallback;
}

// Capa de acceso a datos del terapeuta, contra /my-articles. Sin estado interno, mismo
// patron que useArticles. Los nombres de las funciones de bloques coinciden con los de
// useArticles para que BlockEditor pueda usar cualquiera de los dos.
export function useMyArticles() {
  const list = useCallback(async (): Promise<MyArticleSummary[]> => {
    try {
      const res = await api.get('/my-articles');
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudieron cargar tus articulos'));
    }
  }, []);

  const create = useCallback(async (data: CreateMyArticleData): Promise<Article> => {
    try {
      const res = await api.post('/my-articles', data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudo crear el articulo'));
    }
  }, []);

  const get = useCallback(async (id: string): Promise<Article> => {
    try {
      const res = await api.get(`/my-articles/${id}`);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudo cargar el articulo'));
    }
  }, []);

  const update = useCallback(async (id: string, data: UpdateMyArticleData): Promise<Article> => {
    try {
      const res = await api.put(`/my-articles/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudo guardar el articulo'));
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    try {
      await api.delete(`/my-articles/${id}`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudo borrar el articulo'));
    }
  }, []);

  const addBlock = useCallback(async (id: string, data: CreateArticleBlockData): Promise<ArticleBlock> => {
    try {
      const res = await api.post(`/my-articles/${id}/blocks`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudo agregar el bloque'));
    }
  }, []);

  const updateBlock = useCallback(async (id: string, blockId: string, data: UpdateArticleBlockData): Promise<ArticleBlock> => {
    try {
      const res = await api.put(`/my-articles/${id}/blocks/${blockId}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudo guardar el bloque'));
    }
  }, []);

  const deleteBlock = useCallback(async (id: string, blockId: string): Promise<void> => {
    try {
      await api.delete(`/my-articles/${id}/blocks/${blockId}`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudo borrar el bloque'));
    }
  }, []);

  const swapBlocks = useCallback(async (id: string, blockAId: string, blockBId: string): Promise<void> => {
    try {
      await api.patch(`/my-articles/${id}/blocks/swap`, { blockAId, blockBId });
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudo reordenar'));
    }
  }, []);

  const submit = useCallback(async (id: string): Promise<Article> => {
    try {
      const res = await api.post(`/my-articles/${id}/submit`);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudo enviar el articulo a revision'));
    }
  }, []);

  const withdraw = useCallback(async (id: string): Promise<Article> => {
    try {
      const res = await api.post(`/my-articles/${id}/withdraw`);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'No se pudo retirar el articulo'));
    }
  }, []);

  return { list, create, get, update, remove, addBlock, updateBlock, deleteBlock, swapBlocks, submit, withdraw };
}
