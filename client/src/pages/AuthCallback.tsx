import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setToken } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('message');

    if (error) {
      console.error('Auth error:', error);
      navigate('/?error=' + encodeURIComponent(error));
      return;
    }

    if (token) {
      setToken(token).then(() => {
        navigate('/dashboard');
      });
    } else {
      navigate('/');
    }
  }, [searchParams, setToken, navigate]);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-dark-300">Signing you in...</p>
      </div>
    </div>
  );
}
