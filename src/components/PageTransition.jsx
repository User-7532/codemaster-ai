import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children, className }) {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return className ? <div className={className}>{children}</div> : children;

  return (
    <motion.div
      key={pathname}
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}