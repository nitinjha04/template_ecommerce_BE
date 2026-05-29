import dns from 'node:dns';

// Many hosts (Railway, Render, etc.) have no IPv6 egress; prefer IPv4 for SMTP and APIs.
dns.setDefaultResultOrder('ipv4first');

import app from './app';
import { connectDB } from './config/db';
import { logEmailStartup } from './config/emailTransport';
import { env } from './config/env';

const start = async (): Promise<void> => {
  await connectDB();
  logEmailStartup();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port} [${env.nodeEnv}]`);
    console.log(`API: http://localhost:${env.port}/api/v1`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
