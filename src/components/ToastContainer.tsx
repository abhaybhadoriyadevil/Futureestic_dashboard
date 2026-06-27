import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../stores/useUIStore';
import { Info, CheckCircle, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-accent" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-accent" />;
      default: return <Info className="w-4 h-4 text-blue-accent" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className="pointer-events-auto bg-glass-bg border border-color-border-color shadow-lg rounded-lg p-3 pr-10 relative flex items-center gap-3 backdrop-blur-md text-primary-text min-w-[250px]"
          >
            {getIcon(toast.type)}
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-text hover:text-primary-text rounded-md hover:bg-secondary-bg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
