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
  title: string; excerpt: string; categoryId: string; coverImage?: string; featured?: boolean;
}
export interface UpdateArticleData {
  title?: string; excerpt?: string; categoryId?: string; coverImage?: string; featured?: boolean;
}

export interface CreateArticleBlockData {
  type: ArticleBlockType; text?: string; imageUrl?: string; imageAlt?: string;
  buttonLabel?: string; buttonUrl?: string;
}
export interface UpdateArticleBlockData {
  text?: string; imageUrl?: string; imageAlt?: string;
  buttonLabel?: string; buttonUrl?: string; order?: number;
}

export function useArticles() {
  const listCategories = useCallback(async (): Promise<Category[]> => {
    const res = await api.get('/articles/categories');
    return res.data;
  }, []);

  const createCategory = useCallback(async (data: CreateCategoryData): Promise<Category> => {
    const res = await api.post('/articles/categories', data);
    return res.data;
  }, []);

  const updateCategory = useCallback(async (id: string, data: UpdateCategoryData): Promise<Category> => {
    const res = await api.put(`/articles/categories/${id}`, data);
    return res.data;
  }, []);

  const listArticles = useCallback(async (): Promise<Article[]> => {
    const res = await api.get('/articles');
    return res.data;
  }, []);

  const getArticle = useCallback(async (id: string): Promise<Article> => {
    const res = await api.get(`/articles/${id}`);
    return res.data;
  }, []);

  const createArticle = useCallback(async (data: CreateArticleData): Promise<Article> => {
    const res = await api.post('/articles', data);
    return res.data;
  }, []);

  const updateArticle = useCallback(async (id: string, data: UpdateArticleData): Promise<Article> => {
    const res = await api.put(`/articles/${id}`, data);
    return res.data;
  }, []);

  const publishArticle = useCallback(async (id: string): Promise<Article> => {
    const res = await api.patch(`/articles/${id}/publish`);
    return res.data;
  }, []);

  const unpublishArticle = useCallback(async (id: string): Promise<Article> => {
    const res = await api.patch(`/articles/${id}/unpublish`);
    return res.data;
  }, []);

  const deleteArticle = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/articles/${id}`);
  }, []);

  const createBlock = useCallback(async (articleId: string, data: CreateArticleBlockData): Promise<ArticleBlock> => {
    const res = await api.post(`/articles/${articleId}/blocks`, data);
    return res.data;
  }, []);

  const updateBlock = useCallback(async (articleId: string, blockId: string, data: UpdateArticleBlockData): Promise<ArticleBlock> => {
    const res = await api.put(`/articles/${articleId}/blocks/${blockId}`, data);
    return res.data;
  }, []);

  const deleteBlock = useCallback(async (articleId: string, blockId: string): Promise<void> => {
    await api.delete(`/articles/${articleId}/blocks/${blockId}`);
  }, []);

  return {
    listCategories, createCategory, updateCategory,
    listArticles, getArticle, createArticle, updateArticle,
    publishArticle, unpublishArticle, deleteArticle,
    createBlock, updateBlock, deleteBlock,
  };
}
