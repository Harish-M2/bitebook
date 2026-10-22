import SignInScreen from '@/components/auth/SignInScreen';
import { AuthThemeProvider } from '@/components/auth/AuthThemeProvider';

export default function SignIn() {
  return <AuthThemeProvider><SignInScreen /></AuthThemeProvider>;
}

