import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import usersRouter from './routes/users.js';
import workflowsRouter from './routes/workflows.js';
import chatRouter from './routes/chat.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/collections/users', usersRouter);
app.use('/api/collections/workflows', workflowsRouter);
app.use('/api/chat', chatRouter);

app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[api error]', err);
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || 'Internal server error',
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://${HOST}:${PORT}`);
});
