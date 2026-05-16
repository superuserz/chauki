import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '@/stores/toastStore';

export function Toast() {
  const current = useToastStore((s) => s.current);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 flex justify-center">
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-md bg-white/95 px-4 py-2 text-sm font-medium text-black shadow-lg"
          >
            {current.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
