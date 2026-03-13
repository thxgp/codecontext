import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './middleware/index.js';
import { authRoutes, reposRoutes, aiRoutes } from './routes/index.js';
import { supabase } from './config/supabase.js';

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [config.clientUrl, config.clientUrl.replace('https://', 'https://www.')];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Diagnostic endpoint — temporary, remove after debugging
app.get('/debug/supabase', async (_req, res) => {
  const url = config.supabase.url;
  const keyPreview = config.supabase.anonKey
    ? `${config.supabase.anonKey.slice(0, 20)}...${config.supabase.anonKey.slice(-10)}`
    : 'NOT SET';

  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    res.json({
      supabaseUrl: url || 'NOT SET',
      anonKeyPreview: keyPreview,
      anonKeyLength: config.supabase.anonKey?.length || 0,
      testQuery: error ? { error: error.message, code: error.code, details: error.details } : { success: true, rows: data?.length },
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    res.json({
      supabaseUrl: url || 'NOT SET',
      anonKeyPreview: keyPreview,
      anonKeyLength: config.supabase.anonKey?.length || 0,
      testQuery: { error: errMsg },
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/repos', reposRoutes);
app.use('/api/ai', aiRoutes);

// Error handler
app.use(errorHandler);

// Start server
app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
