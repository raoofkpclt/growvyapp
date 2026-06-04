export const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    
    <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in max-h-[90vh] flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <h3 className="text-white font-semibold text-base">
          {title}
        </h3>

        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="px-6 py-5 overflow-y-auto">
        {children}
      </div>
    </div>
  </div>
);

export const Field = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{label}</label>
    <input {...props} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors" />
  </div>
);

export const TextAreaField = ({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{label}</label>
    <textarea {...props} rows={3} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors resize-none" />
  </div>
);

