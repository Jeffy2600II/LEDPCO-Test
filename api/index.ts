import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/index';

// Vercel expects a handler function for API routes.
// Wrap the express app so Vercel executes it as a serverless handler.
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    return (app as any)(req, res);
  } catch (err) {
    console.error('Error in api handler:', err);
    res.status(500).send('Internal Server Error');
  }
};