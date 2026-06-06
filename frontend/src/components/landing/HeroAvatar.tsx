import { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface Props { scrollProgress: number; }

export default function HeroAvatar({ scrollProgress }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      const mx = e.clientX / window.innerWidth - 0.5;
      const my = e.clientY / window.innerHeight - 0.5;
      gsap.to(wrapRef.current, {
        x: -mx * 30, y: -my * 30,
        duration: 1.2, ease: 'power2.out', overwrite: 'auto',
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const exit = Math.min(1, scrollProgress);
  const opacity = 1 - exit * 0.9;
  const tx = exit * 80;

  return (
    <div
      ref={wrapRef}
      className="absolute right-0 bottom-0 w-[55%] md:w-[52%] h-full pointer-events-none z-10 flex items-end justify-end"
      style={{ opacity, transform: `translateX(${tx}px)` }}
    >
      <div className="relative h-full w-full flex items-end justify-center overflow-hidden md:overflow-visible">
        <img
          src="/aliax-avatar.png"
          alt="Aliax"
          draggable={false}
          className="h-[70%] md:h-[100%] w-auto object-contain object-bottom select-none"
          style={{
            animation: 'avatarFloat 3.5s ease-in-out infinite',
            maxWidth: 'none',
            mixBlendMode: 'screen',
          }}
        />
      </div>
    </div>
  );
}
