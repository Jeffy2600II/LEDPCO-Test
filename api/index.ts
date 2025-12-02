import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../src/index';

// Vercel expects a function for API routes.
// This wrapper forwards incoming requests to the Express app instance.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Express apps can be invoked as (req, res)
    return (app as any)(req, res);
  } catch (err) {
    console.error('Error in api handler:', err);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
}