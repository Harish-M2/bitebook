import ForgotPasswordScreen from '@/components/auth/ForgotPasswordScreen';
import { AuthThemeProvider } from '@/components/auth/AuthThemeProvider';

export default function ForgotPassword() {
  return <AuthThemeProvider><ForgotPasswordScreen /></AuthThemeProvider>;
}