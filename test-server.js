const express = require('express');
const app = express();
const PORT = 5000;

app.get('/', (req, res) => {
  res.send('Test serveur fonctionne !');
});

const server = app.listen(PORT, () => {
  console.log(`✅ Serveur de test sur http://localhost:${PORT}`);
  console.log('Le processus devrait rester actif...');
});

// Logs pour debug
console.log('Type de server:', typeof server);
console.log('Server est truthy:', !!server);

// Empêcher la sortie prématurée
setInterval(() => {
  console.log('🔄 Serveur toujours actif...', new Date().toLocaleTimeString());
}, 5000);