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
      navigate('/?error=' + encodeURIComponent(error));
      return;
    }

    if (token) {
      setToken(token)
        .then(() => navigate('/dashboard'))
        .catch(() => navigate('/'));
    } else {
      navigate('/');
    }
  }, [searchParams, setToken, navigate]);

  return null;
}
