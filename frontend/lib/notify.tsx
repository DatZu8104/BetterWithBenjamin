import { toast } from 'sonner';
import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

// Cấu hình UI chung cho các thông báo
const ToastCard = ({ icon: Icon, title, message, colorClass, bgClass, borderClass }: any) => (
  <div className={`flex items-start gap-3 p-4 rounded-xl border w-full sm:w-[356px] shadow-2xl ${bgClass} ${borderClass}`}>
    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${colorClass}`} />
    <div className="flex flex-col gap-1">
      <span className="text-white font-bold text-sm">{title}</span>
      {message && <span className="text-zinc-400 text-sm leading-snug">{message}</span>}
    </div>
  </div>
);

// Đối tượng notify chứa các logic tái sử dụng
export const notify = {
  success: (title: string, message?: string) => {
    toast.custom((t) => (
      <ToastCard 
        icon={CheckCircle2} 
        title={title} 
        message={message} 
        colorClass="text-emerald-500" 
        bgClass="bg-zinc-900" 
        borderClass="border-emerald-500/30" 
      />
    ), { duration: 3000 });
  },

  error: (title: string, message?: string) => {
    toast.custom((t) => (
      <ToastCard 
        icon={XCircle} 
        title={title} 
        message={message} 
        colorClass="text-red-500" 
        bgClass="bg-zinc-900" 
        borderClass="border-red-500/30" 
      />
    ), { duration: 4000 });
  },

  warning: (title: string, message?: string) => {
    toast.custom((t) => (
      <ToastCard 
        icon={AlertTriangle} 
        title={title} 
        message={message} 
        colorClass="text-amber-500" 
        bgClass="bg-zinc-900" 
        borderClass="border-amber-500/30" 
      />
    ), { duration: 4000 });
  },

  info: (title: string, message?: string) => {
    toast.custom((t) => (
      <ToastCard 
        icon={Info} 
        title={title} 
        message={message} 
        colorClass="text-blue-500" 
        bgClass="bg-zinc-900" 
        borderClass="border-blue-500/30" 
      />
    ), { duration: 3000 });
  }
};