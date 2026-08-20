import { Redirect } from 'expo-router';

/** Root index — Bitebook has no unauthenticated landing page yet, so always land on Home. */
export default function Index() {
  return <Redirect href="/home" />;
}
