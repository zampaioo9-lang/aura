import { useAuth } from '../context/AuthContext';

/**
 * Returns true if the user can access a module.
 * Access = isPro (active PRO plan) OR individual override granted by admin.
 */
export function useFeature(key: string): boolean {
  const { isPro, featureOverrides } = useAuth();
  return isPro || featureOverrides[key] === true;
}
