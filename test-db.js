const { Client } = require('pg');

// Essaie avec 127.0.0.1
const client = new Client({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'postgres', // On se connecte à la base par défaut
  password: 'admin', // <--- METS TON MOT DE PASSE ICI
  port: 5432,
});

console.log("Tentative de connexion...");

client.connect()
  .then(() => {
    console.log("✅ SUCCÈS ! Connexion réussie à PostgreSQL !");
    return client.end();
  })
  .catch(err => {
    console.error("❌ ÉCHEC :", err.message);
    // Affiche plus de détails si possible
    if (err.code) console.error("Code erreur:", err.code);
    client.end();
  });