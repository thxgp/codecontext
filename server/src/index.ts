import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { errorHandler } from './middleware/index.js';
import { authRoutes, reposRoutes, aiRoutes } from './routes/index.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
