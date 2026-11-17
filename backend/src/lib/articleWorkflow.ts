export type ArticleState = 'DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'PUBLISHED';

// Estados en los que el terapeuta puede editar y enviar.
const AUTHOR_EDITABLE: ArticleState[] = ['DRAFT', 'CHANGES_REQUESTED'];

export function canAuthorEdit(status: string): boolean {
  return AUTHOR_EDITABLE.includes(status as ArticleState);
}

export function canAuthorSubmit(status: string): boolean {
  return canAuthorEdit(status);
}

export function canAuthorWithdraw(status: string): boolean {
  return status === 'PENDING_REVIEW';
}

export function canAuthorDelete(status: string): boolean {
  return status === 'DRAFT' || status === 'CHANGES_REQUESTED';
}

export interface SubmitCheck {
  title: string;
  excerpt: string;
  blockCount: number;
  textBlockCount: number;
}

// Devuelve el mensaje de error, o null si el artículo se puede enviar a revisión.
export function validateForSubmit(a: SubmitCheck): string | null {
  if (a.title.trim().length < 3) return 'Escribe un título de al menos 3 caracteres';
  if (a.excerpt.trim().length < 10) return 'Escribe un extracto de al menos 10 caracteres';
  if (a.blockCount === 0) return 'Agrega contenido a tu artículo antes de enviarlo';
  if (a.textBlockCount === 0) return 'Tu artículo necesita al menos un bloque de texto';
  return null;
}
