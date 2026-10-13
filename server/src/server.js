import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import productRoutes from './routes/productRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import templateRoutes from './routes/templateRoutes.js';
import excelRoutes from './routes/excelRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import seedRoutes from './routes/seedRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));

// Static files for uploaded images / signatures / templates
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes - Mount on both /api and root prefixes for Vercel/proxy compatibility
const mountRoutes = (prefix = '/api') => {
  const p = (route) => `${prefix}${route}`;
  app.use(p('/auth'), authRoutes);
  app.use(p('/business'), businessRoutes);
  app.use(p('/customers'), customerRoutes);
  app.use(p('/products'), productRoutes);
  app.use(p('/invoices'), invoiceRoutes);
  app.use(p('/payments'), paymentRoutes);
  app.use(p('/templates'), templateRoutes);
  app.use(p('/excel'), excelRoutes);
  app.use(p('/reports'), reportRoutes);
  app.use(p('/notifications'), notificationRoutes);
  app.use(p('/search'), searchRoutes);
  app.use(p('/seed'), seedRoutes);
  app.get(p('/health'), (req, res) => {
    res.json({
      status: 'healthy',
      product: 'BillFlow',
      timestamp: new Date().toISOString(),
    });
  });
};

mountRoutes('/api');
mountRoutes('');

// Central Error Handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`[BillFlow Server] Running on http://localhost:${PORT}`);
});

export default app;

