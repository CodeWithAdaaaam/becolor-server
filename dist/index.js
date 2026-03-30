"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const serviceRoutes_1 = __importDefault(require("./routes/serviceRoutes"));
const clientRoutes_1 = __importDefault(require("./routes/clientRoutes"));
const appointmentRoutes_1 = __importDefault(require("./routes/appointmentRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const statsRoutes_1 = __importDefault(require("./routes/statsRoutes"));
const TransactionRoutes_1 = __importDefault(require("./routes/TransactionRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const logRoutes_1 = __importDefault(require("./routes/logRoutes"));
const whatsappRoutes_1 = __importDefault(require("./routes/whatsappRoutes"));
const whatsappClient_1 = require("./services/whatsappClient");
const reminderJob_1 = require("./cron/reminderJob");
const supplierRoutes_1 = __importDefault(require("./routes/supplierRoutes"));
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || '3001', 10);
const app = (0, express_1.default)();
// --- CORS ---
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (origin.includes('localhost') ||
            origin.includes('vercel.app') ||
            origin.includes('onrender.com') ||
            origin.includes('railway.app') ||
            origin.includes('hostinger.com') ||
            origin.includes('hostingersite.com') ||
            (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN)) {
            callback(null, true);
        }
        else {
            console.log(`🚫 CORS Bloqué: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
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
app.use('/api/auth', authRoutes_1.default);
app.use('/api/services', serviceRoutes_1.default);
app.use('/api/clients', clientRoutes_1.default);
app.use('/api/appointments', appointmentRoutes_1.default);
app.use('/api/settings', settingsRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/stats', statsRoutes_1.default);
app.use('/api/caisse', TransactionRoutes_1.default);
app.use('/api/booking', bookingRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/whatsapp', whatsappRoutes_1.default);
app.use('/api/logs', logRoutes_1.default);
app.use('/api/suppliers', supplierRoutes_1.default);
// ✅ Production (Hostinger Passenger) : exporter sans listen
// ✅ Dev local : lancer le serveur normalement
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Serveur be COLOR démarré sur le port ${PORT}`);
        (0, reminderJob_1.startReminderJob)();
        setTimeout(() => {
            console.log("🔄 Lancement WhatsApp en arrière-plan...");
            (0, whatsappClient_1.initWhatsApp)().catch(err => console.error("❌ WhatsApp:", err));
        }, 5000);
    });
}
else {
    // Passenger gère le listen — on lance quand même les jobs
    (0, reminderJob_1.startReminderJob)();
    setTimeout(() => {
        console.log("🔄 Lancement WhatsApp en arrière-plan...");
        (0, whatsappClient_1.initWhatsApp)().catch(err => console.error("❌ WhatsApp:", err));
    }, 5000);
}
module.exports = app;
