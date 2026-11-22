import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import { motion, useMotionValue, useSpring } from 'motion/react';

/* ページ全体の挙動: 慣性スクロール(Lenis)とカーソルの輪。 */
export default function Chrome() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 520, damping: 42, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 520, damping: 42, mass: 0.4 });
  const [fine, setFine] = useState(false);
  const [hot, setHot] = useState(false);
  const [label, setLabel] = useState('');
  const [down, setDown] = useState(false);

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const mq = matchMedia('(hover: hover) and (pointer: fine)');
    setFine(mq.matches);
    if (!mq.matches) return;
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = (e.target as Element | null)?.closest?.('a, button, [data-cursor]') as HTMLElement | null;
      setHot(!!el);
      setLabel(el?.dataset.cursor ?? '');
    };
    const dn = () => setDown(true);
    const up = () => setDown(false);
    addEventListener('pointermove', move, { passive: true });
    addEventListener('pointerdown', dn);
    addEventListener('pointerup', up);
    return () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerdown', dn);
      removeEventListener('pointerup', up);
    };
  }, [x, y]);

  if (!fine) return null;
  return (
    <motion.div className="cursor" style={{ x: sx, y: sy }} aria-hidden="true">
      <motion.span
        className="cursor-ring"
        animate={{ scale: down ? 0.7 : hot ? (label ? 3.2 : 2.2) : 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      />
      {label && hot && <span className="cursor-label">{label}</span>}
    </motion.div>
  );
}
