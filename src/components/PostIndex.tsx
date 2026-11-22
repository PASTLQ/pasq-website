import { useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';

export type IndexItem = {
  id: string;
  href: string;
  date: string;
  iso: string;
  title: string | null;
  excerpt: string;
  tags: string[];
  draft?: boolean;
};

/* 記事の索引。ホバーで行が反転し、カーソルに抜粋のカードが追従する。 */
export default function PostIndex({ items }: { items: IndexItem[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });
  const cur = hover === null ? null : items[hover];

  return (
    <>
      <ol
        className="index"
        onPointerMove={(e) => {
          if (e.pointerType !== 'mouse') return;
          x.set(e.clientX + 28);
          y.set(e.clientY + 24);
        }}
        onPointerLeave={() => setHover(null)}
      >
        {items.map((p, i) => (
          <li key={p.id} className="ix-row">
            <a
              href={p.href}
              data-cursor="読む"
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <span className={'ix-title' + (p.title ? '' : ' is-untitled')}>{p.title ?? p.excerpt}</span>
              <span className="ix-meta">
                <time dateTime={p.iso}>{p.date}</time>
                {p.tags.length > 0 && <span className="ix-tags">{p.tags.map((t) => `#${t}`).join(' ')}</span>}
                {p.draft && <span className="ix-tags">下書き</span>}
              </span>
              <span className="ix-arrow" aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ol>
      <AnimatePresence>
        {cur && (
          <motion.aside
            key={cur.id}
            className="peek"
            style={{ x: sx, y: sy }}
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.96, filter: 'blur(4px)' }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            aria-hidden="true"
          >
            <span className="peek-date">{cur.date}</span>
            <span className="peek-text">{cur.excerpt}</span>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
