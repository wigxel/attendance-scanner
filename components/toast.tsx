'use client';
 
import { toast } from 'sonner';
 
interface ToastComponentProps{
    type: string
    message: string
}
export default function Toast({type, message}: ToastComponentProps) {
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'info':
      toast.info(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
    case 'loading':
      toast.loading(message);
      break;
    default:
      toast(message);
  }
  return null;
}