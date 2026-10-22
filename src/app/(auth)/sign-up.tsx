import SignUpScreen from '@/components/auth/SignUpScreen';
import { AuthThemeProvider } from '@/components/auth/AuthThemeProvider';

export default function SignUp() {
  return <AuthThemeProvider><SignUpScreen /></AuthThemeProvider>;
}