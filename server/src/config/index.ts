import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback',
  },
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY || '',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    chatModel: 'meta/llama-3.1-70b-instruct',
    embeddingModel: 'nvidia/nv-embedqa-e5-v5',
    embeddingDimensions: 1024,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: '7d',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
