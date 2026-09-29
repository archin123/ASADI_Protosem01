import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from backend directory and workspace root
const envCandidatePaths = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), 'backend', '.env'),
  path.resolve(process.cwd(), '.env'),
];

let loadedEnvPath = null;
for (const envPath of envCandidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    if (!loadedEnvPath) {
      loadedEnvPath = envPath;
    }
  }
}

// Initialize LangSmith configuration before loading agents
import './config/langsmith.js';
import { getLangSmithStatus } from './config/langsmith.js';

import express from 'express';
import cors from 'cors';
import { connectDB, getDBStatus } from './db/connection.js';
import { PostRepository } from './db/storage.js';
import { syntheticInstagramPosts } from './data/syntheticPosts.js';

import authRoutes from './routes/authRoutes.js';
import postsRoutes from './routes/postsRoutes.js';
import importRoutes from './routes/importRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';
import similarityRoutes from './routes/similarityRoutes.js';
import plannerRoutes from './routes/plannerRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import agentRoutes from './routes/agentRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logger for debugging in development
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Health & Status endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = getDBStatus();
  const postCount = await PostRepository.count();
  const langsmithStatus = getLangSmithStatus();

  res.json({
    status: 'healthy',
    project: 'Content Recycler (Smart India Hackathon)',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    libraryPostCount: postCount,
    aiEngine: 'LangChain.js Multi-Agent Swarm + Google Gemini AI + TF-IDF Vectorizer',
    environment: {
      envFileLoaded: Boolean(loadedEnvPath),
      envFilePath: loadedEnvPath || 'None found',
    },
    langsmith: {
      tracingEnabled: langsmithStatus.tracingEnabled,
      project: process.env.LANGSMITH_PROJECT || langsmithStatus.project,
      endpoint: process.env.LANGSMITH_ENDPOINT || langsmithStatus.endpoint,
      hasApiKey: langsmithStatus.hasApiKey,
      activeSdk: 'langsmith + @langchain/core',
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/import', importRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/similarity', similarityRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/agents', agentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

async function startServer() {
  await connectDB();

  // Auto-seed synthetic posts on first launch if library is empty
  try {
    const existingCount = await PostRepository.count();
    if (existingCount === 0) {
      console.log('[Startup] Empty content library detected. Auto-seeding 50 synthetic demo posts...');
      await PostRepository.insertMany(syntheticInstagramPosts);
      console.log('[Startup] ✅ 50 synthetic demo posts loaded ready for SIH evaluation.');
    } else {
      console.log(`[Startup] Content library already populated with ${existingCount} posts.`);
    }
  } catch (seedErr) {
    console.warn('[Startup] Warning during initial seed check:', seedErr.message);
  }

  const ls = getLangSmithStatus();
  const apiKeyPresent = Boolean(process.env.LANGSMITH_API_KEY && process.env.LANGSMITH_API_KEY.length > 10);

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Content Recycler Backend Server running on port ${PORT}`);
    console.log(`📍 API Base: http://localhost:${PORT}/api`);
    console.log(`📍 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📍 .env Loaded: ${loadedEnvPath || 'NONE'}`);
    console.log(`📍 LANGSMITH_TRACING: ${process.env.LANGSMITH_TRACING}`);
    console.log(`📍 LANGSMITH_ENDPOINT: ${process.env.LANGSMITH_ENDPOINT}`);
    console.log(`📍 LANGSMITH_PROJECT: ${process.env.LANGSMITH_PROJECT}`);
    console.log(`📍 LANGSMITH_API_KEY: ${apiKeyPresent ? 'Configured (Backend only)' : 'EMPTY / NOT_SET in .env'}`);
    console.log(`📍 LangSmith Cloud Sync: ${apiKeyPresent ? 'CONNECTED TO CLOUD' : 'LOCAL BUFFER (Add key to .env for Cloud Sync)'}`);
    console.log(`=======================================================`);
  });
}

startServer();
