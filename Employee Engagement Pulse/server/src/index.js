// CRITICAL: Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the server directory (go up one level from src to server root)
const envPath = path.join(__dirname, '..', '.env');
console.log('🔧 Loading environment variables...');
console.log('Looking for .env at:', envPath);
console.log('File exists:', fs.existsSync(envPath));
const result = dotenv.config({ path: envPath });
console.log('Dotenv result:', result.error ? result.error.message : 'Success');
console.log('Environment variables loaded:', Object.keys(result.parsed || {}).length);
console.log('SLACK_CLIENT_ID after load:', process.env.SLACK_CLIENT_ID);
console.log('🔧 Environment loading complete, now importing modules...');

// NOW import everything else after environment is loaded
import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import cron from 'node-cron';
import authRoutes from './routes/auth.js';
import slackRoutes from './routes/slack.js';
import dashboardRoutes from './routes/dashboard.js';
import slackService from './services/slackService.js';
import aggregationService from './services/aggregationService.js';
const { syncAllChannels } = slackService;
const { processDailyAggregations, processWeeklyAggregations } = aggregationService;

const app = express();

// Trust proxy (needed for correct req.secure when behind ngrok/Cloudflare)
app.set('trust proxy', 1);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

const corsOptions = {
  origin: clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/dashboard', dashboardRoutes);

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI is not set in environment');
  process.exit(1);
}

const port = process.env.PORT || 5001;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start the server
    app.listen(port, () => console.log(`Server listening on port ${port}`));
    
    // Set up cron jobs for data processing
    setupCronJobs();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Cron job setup
function setupCronJobs() {
  console.log('Setting up cron jobs...');
  console.log('Sync Strategy: Full sync provides complete dataset, scheduled sync keeps it updated');
  
  // Sync Slack messages every 15 minutes (incremental sync)
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running scheduled Slack sync...');
    try {
      const results = await syncAllChannels(false); // false = incremental sync
      console.log('Scheduled sync completed:', results);
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  });

  // Process daily aggregations every day at 1 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('Running daily aggregations...');
    try {
      await processDailyAggregations();
      console.log('Daily aggregations completed');
    } catch (error) {
      console.error('Daily aggregations failed:', error);
    }
  });

  // Process weekly aggregations every Monday at 2 AM
  cron.schedule('0 2 * * 1', async () => {
    console.log('Running weekly aggregations...');
    try {
      await processWeeklyAggregations();
      console.log('Weekly aggregations completed');
    } catch (error) {
      console.error('Weekly aggregations failed:', error);
    }
  });
  
  console.log('Cron jobs set up successfully');
}


