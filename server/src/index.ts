import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import projectRoutes from './routes/projects';
import subtaskRoutes from './routes/subtasks';
import activityRoutes from './routes/activities';
import taskRoutes from './routes/tasks';
import summaryRoutes from './routes/summary';
import { startCronJobs } from './services/cron';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/subtasks', subtaskRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/summary', summaryRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

startCronJobs();

app.listen(PORT, () => {
  console.log(`WorkTrack server running on http://localhost:${PORT}`);
});

export default app;
