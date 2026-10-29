import { useCallback } from 'react';
import api from '../api/client';

export type CategoryAudience = 'PACIENTES' | 'TERAPEUTAS';
export type ArticleStatus = 'DRAFT' | 'PUBLISHED';
export type ArticleBlockType = 'TEXT' | 'IMAGE' | 'BUTTON';

export interface Category {
  id: string;
  name: string;
  slug: string;
  audience: CategoryAudience;
  active: boolean;
  order: number;
}

export interface ArticleBlock {
  id: string;
  articleId: string;
  order: number;
  type: ArticleBlockType;
  text: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  buttonLabel: string | null;
  buttonUrl: string | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  metaDescription: string | null;
  categoryId: string;
  category?: Category;
  coverImage: string | null;
  featured: boolean;
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  blocks?: ArticleBlock[];
}

export interface CreateCategoryData { name: string; audience: CategoryAudience }
export interface UpdateCategoryData { active?: boolean; order?: number }

export interface CreateArticleData {
  title: string; excerpt: string; metaDescription?: string; categoryId: string; coverImage?: string; featured?: boolean;
}
export interface UpdateArticleData {
  title?: string; excerpt?: string; metaDescription?: string; categoryId?: string; coverImage?: string; featured?: boolean;
}

export interface CreateArticleBlockData {
  type: ArticleBlockType; text?: string; imageUrl?: string; imageAlt?: string;
  buttonLabel?: string; buttonUrl?: string;
}
export interface UpdateArticleBlockData {
  text?: string; imageUrl?: string; imageAlt?: string;
  buttonLabel?: string; buttonUrl?: string; order?: number;
}

function errorMessage(err: any, fallback: string): string {
  return err.response?.data?.error || fallback;
}

// Pura capa de acceso a datos: sin estado interno y sin auto-carga al montarse. El
// AdminPanel del CMS (que consume este hook en tareas posteriores) mantiene su propio
// estado (categorias, articulos, bloques) y decide cuando llamar cada funcion -- mismo
// patron que QuestionnaireEditor.tsx consumiendo las funciones CRUD de useOfferings sin
// tocar su estado interno `offerings`.
export function useArticles() {
  const listCategories = useCallback(async (): Promise<Category[]> => {
    try {
      const res = await api.get('/articles/categories');
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al cargar las categorias'));
    }
  }, []);

  const createCategory = useCallback(async (data: CreateCategoryData): Promise<Category> => {
    try {
      const res = await api.post('/articles/categories', data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al crear la categoria'));
    }
  }, []);

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryData): Promise<Category> => {
    try {
      const res = await api.put(`/articles/categories/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar la categoria'));
    }
  }, []);

  const listArticles = useCallback(async (): Promise<Article[]> => {
    try {
      const res = await api.get('/articles');
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al cargar los articulos'));
    }
  }, []);

  const getArticle = useCallback(async (id: string): Promise<Article> => {
    try {
      const res = await api.get(`/articles/${id}`);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al cargar el articulo'));
    }
  }, []);

  const createArticle = useCallback(async (data: CreateArticleData): Promise<Article> => {
    try {
      const res = await api.post('/articles', data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al crear el articulo'));
    }
  }, []);

  const updateArticle = useCallback(async (id: string, data: UpdateArticleData): Promise<Article> => {
    try {
      const res = await api.put(`/articles/${id}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar el articulo'));
    }
  }, []);

  const publishArticle = useCallback(async (id: string): Promise<Article> => {
    try {
      const res = await api.patch(`/articles/${id}/publish`);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al publicar el articulo'));
    }
  }, []);

  const unpublishArticle = useCallback(async (id: string): Promise<Article> => {
    try {
      const res = await api.patch(`/articles/${id}/unpublish`);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al despublicar el articulo'));
    }
  }, []);

  const deleteArticle = useCallback(async (id: string): Promise<void> => {
    try {
      await api.delete(`/articles/${id}`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al borrar el articulo'));
    }
  }, []);

  const createBlock = useCallback(async (articleId: string, data: CreateArticleBlockData): Promise<ArticleBlock> => {
    try {
      const res = await api.post(`/articles/${articleId}/blocks`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al agregar el bloque'));
    }
  }, []);

  const updateBlock = useCallback(async (articleId: string, blockId: string, data: UpdateArticleBlockData): Promise<ArticleBlock> => {
    try {
      const res = await api.put(`/articles/${articleId}/blocks/${blockId}`, data);
      return res.data;
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al actualizar el bloque'));
    }
  }, []);

  const deleteBlock = useCallback(async (articleId: string, blockId: string): Promise<void> => {
    try {
      await api.delete(`/articles/${articleId}/blocks/${blockId}`);
    } catch (err: any) {
      throw new Error(errorMessage(err, 'Error al borrar el bloque'));
    }
  }, []);

  return {
    listCategories, createCategory, updateCategory,
    listArticles, getArticle, createArticle, updateArticle,
    publishArticle, unpublishArticle, deleteArticle,
    createBlock, updateBlock, deleteBlock,
  };
}
