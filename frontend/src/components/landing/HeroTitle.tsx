import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface Props { scrollProgress: number; }

export default function HeroTitle({ scrollProgress }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    const chars: HTMLSpanElement[] = [];
    'Aliax'.split('').forEach(ch => {
      const s = document.createElement('span');
      s.className = 'char inline-block will-change-transform';
      s.textContent = ch;
      el.appendChild(s);
      chars.push(s);
    });
    const timeline = gsap.timeline({ paused: true });
    timeline.fromTo(chars,
      { opacity: 1, yPercent: 0, y: 0, scaleY: 1, scaleX: 1, transformOrigin: '50% 0%' },
      { opacity: 0, yPercent: 300, y: '25vh', scaleY: 1.2, scaleX: 0.9, stagger: 0.03, ease: 'power2.inOut' }
    );
    tl.current = timeline;
    return () => { timeline.kill(); };
  }, []);

  useEffect(() => {
    if (!tl.current) return;
    gsap.to(tl.current, {
      progress: Math.min(1, scrollProgress),
      duration: 0.6, ease: 'power1.out', overwrite: 'auto',
    });
  }, [scrollProgress]);

  return (
    <div className="absolute bottom-[64px] md:bottom-[40px] left-[1%] right-[1%] w-[98%] pointer-events-none z-30 select-none flex justify-center">
      <div
        ref={ref}
        className="text-[18vw] sm:text-[14vw] md:text-[7vw] lg:text-[6vw] leading-none font-normal text-white whitespace-nowrap text-center"
        style={{ fontFamily: 'Michroma, sans-serif', letterSpacing: '-0.07em', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
      />
    </div>
  );
}
