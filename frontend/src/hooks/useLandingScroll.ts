import { useState, useEffect, useRef, useCallback } from 'react';

const MAX = 3.5;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const easeInOutCubic = (p: number) =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

export type SectionId = 'hero' | 'terapeutas' | 'manifesto' | 'acerca' | 'cta';

function getSection(p: number): SectionId {
  if (p < 0.18) return 'hero';
  if (p < 0.45) return 'terapeutas';
  if (p < 0.68) return 'manifesto';
  if (p < 1.15) return 'acerca';
  return 'cta';
}

export function useLandingScroll() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [lerpedProgress, setLerpedProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionId>('hero');

  const rawRef = useRef(0);
  const lerpRef = useRef(0);
  const rafRef = useRef(0);
  const lastTouchY = useRef(0);
  const navAnim = useRef<{ cancel: boolean } | null>(null);

  // rAF lerp loop — smooths scrollProgress into lerpedProgress
  useEffect(() => {
    const tick = () => {
      const diff = rawRef.current - lerpRef.current;
      if (Math.abs(diff) > 0.0001) {
        lerpRef.current += diff * 0.08;
        setLerpedProgress(lerpRef.current);
        setActiveSection(getSection(lerpRef.current));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Gesture controller — disables native scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (navAnim.current) navAnim.current.cancel = true;
      rawRef.current = clamp(rawRef.current + e.deltaY * 0.0006, 0, MAX);
      setScrollProgress(rawRef.current);
    };

    const onTouchStart = (e: TouchEvent) => {
      lastTouchY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (navAnim.current) navAnim.current.cancel = true;
      const delta = lastTouchY.current - e.touches[0].clientY;
      lastTouchY.current = e.touches[0].clientY;
      rawRef.current = clamp(rawRef.current + delta * 0.0015, 0, MAX);
      setScrollProgress(rawRef.current);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  const navigateTo = useCallback((target: number) => {
    const anim = { cancel: false };
    navAnim.current = anim;
    const start = rawRef.current;
    const t0 = performance.now();
    const step = (now: number) => {
      if (anim.cancel) return;
      const p = Math.min((now - t0) / 1200, 1);
      rawRef.current = start + (target - start) * easeInOutCubic(p);
      setScrollProgress(rawRef.current);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  return { scrollProgress, lerpedProgress, activeSection, navigateTo };
}
