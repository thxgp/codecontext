import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface CursorGlowProps {
  /** CSS color for the glow. Defaults to orange accent */
  color?: string;
  /** Size of the glow circle in rem. Defaults to 40 */
  size?: number;
  /** Opacity of the glow. Defaults to 0.12 */
  opacity?: number;
}

export function CursorGlow({ color = 'rgba(249,115,22,0.7)', size = 40, opacity = 0.15 }: CursorGlowProps) {
  const [visible, setVisible] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 25, stiffness: 150 });
  const smoothY = useSpring(mouseY, { damping: 25, stiffness: 150 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!visible) setVisible(true);
    };

    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = () => setVisible(true);

    window.addEventListener('mousemove', handleMouseMove);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [mouseX, mouseY, visible]);

  const halfSize = size / 2;

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-50"
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="absolute rounded-full blur-3xl"
        style={{
          width: `${size}rem`,
          height: `${size}rem`,
          x: smoothX,
          y: smoothY,
          marginLeft: `-${halfSize}rem`,
          marginTop: `-${halfSize}rem`,
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          opacity,
        }}
      />
    </motion.div>
  );
}

export default CursorGlow;
