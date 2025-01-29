import { auth } from '@/lib/firebase';

export const setAuthCookie = async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      
      // Set the cookie via API route
      const response = await fetch('/api/auth/cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Failed to set authentication cookie');
      }
    } catch (error) {
      console.error('Error setting auth cookie:', error);
      throw error;
    }
  }
};