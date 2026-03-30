import express from 'express';
import cors from 'cors'; 
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import serviceRoutes from './routes/serviceRoutes';
import clientRoutes from './routes/clientRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import settingsRoutes from './routes/settingsRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import statsRoutes from './routes/statsRoutes';
import transactionRoutes from './routes/TransactionRoutes';
import bookingRoutes from './routes/bookingRoutes';
import logRoutes from './routes/logRoutes';
import whatsappRoutes from './routes/whatsappRoutes';
import { initWhatsApp } from './services/whatsappClient';
import { startReminderJob } from './cron/reminderJob';
import supplierRoutes from './routes/supplierRoutes';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();

// --- CORS ---
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (
      origin.includes('localhost') ||
      origin.includes('vercel.app') ||
      origin.includes('onrender.com') ||
      origin.includes('railway.app') ||
      origin.includes('hostinger.com') ||
      origin.includes('hostingersite.com') ||
      (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN)
    ) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS Bloqué: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.send('API be COLOR - Prête à recevoir des requêtes. ✅');
});

app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'pong' });
});

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/caisse', transactionRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/suppliers', supplierRoutes);

// ✅ Production (Hostinger Passenger) : exporter sans listen
// ✅ Dev local : lancer le serveur normalement
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur be COLOR démarré sur le port ${PORT}`);
  
  startReminderJob();
  setTimeout(() => {
    console.log("🔄 Lancement WhatsApp en arrière-plan...");
    initWhatsApp().catch(err => console.error("❌ WhatsApp:", err));
  }, 5000);
});

module.exports = app;
