import ResetPasswordScreen from '@/components/auth/ResetPasswordScreen';
import { AuthThemeProvider } from '@/components/auth/AuthThemeProvider';

export default function ResetPassword() {
  return <AuthThemeProvider><ResetPasswordScreen /></AuthThemeProvider>;
}