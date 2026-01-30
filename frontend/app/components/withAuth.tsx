'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const withAuth = (WrappedComponent: React.ComponentType) => {
  const AuthenticatedComponent = () => {
    const router = useRouter();

    useEffect(() => {
      // Check if token is present in localStorage
      const token = localStorage.getItem('token');

      if (!token) {
        router.push('/login'); // Redirect to login if not authenticated
      }
    }, [router]);

    return <WrappedComponent />;
  };

  return AuthenticatedComponent;
};

export default withAuth;
