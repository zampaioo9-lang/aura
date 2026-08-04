import { useAuth } from '../context/AuthContext';

export function useClinicoFeature(key: string): boolean {
  const { isClinico, featureOverrides } = useAuth();
  return isClinico || featureOverrides[key] === true;
}
