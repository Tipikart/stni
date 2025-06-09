const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const openaiKey = process.env.OPENAI_API_KEY;


// Importer les modules
const campaignsModule  = require('./modules/campaigns');
const scansModule      = require('./modules/scans');
const statsModule      = require('./modules/stats');
const blockchainModule = require('./modules/blockchain');
const os = require('os');

// Configuration de base
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR      = path.join(__dirname, 'data');
const DATA_FILE     = path.join(DATA_DIR, 'campaigns.json');
const SCAN_LOG_FILE = path.join(DATA_DIR, 'scanlogs.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
// Servir les fichiers statiques
app.use(express.static(PUBLIC_DIR));
app.use('/css', express.static(path.join(PUBLIC_DIR, 'css')));
app.use('/js', express.static(path.join(PUBLIC_DIR, 'js')));

console.log("📁 Chemin du fichier de données:", DATA_FILE);
console.log("📁 Répertoire courant:", __dirname);

// Démarrer le serveur
app.listen(PORT, () => {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
  const baseUrl = isProduction ? 'https://stni.onrender.com' : `http://localhost:${PORT}`;
  
  console.log(`🚀 Serveur QR Tracker actif sur ${baseUrl}`);
  console.log(`📂 Interface admin disponible sur: ${baseUrl}/admin.html`);
  console.log(`📂 Interface scanner disponible sur: ${baseUrl}/scanner`);
  
  // Vérifier et créer le fichier de données s'il n'existe pas
  if (!fs.existsSync(DATA_FILE)) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify([]));
      console.log("✅ Fichier de données vide créé:", DATA_FILE);
    } catch (err) {
      console.error("❌ Impossible de créer le fichier de données:", err);
    }
  }
  
  // Vérifier et créer le fichier de logs s'il n'existe pas
  if (!fs.existsSync(SCAN_LOG_FILE)) {
    try {
      fs.writeFileSync(SCAN_LOG_FILE, JSON.stringify([]));
      console.log("✅ Fichier de logs vide créé:", SCAN_LOG_FILE);
    } catch (err) {
      console.error("❌ Impossible de créer le fichier de logs:", err);
    }
  }
});


function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      const {address, family, internal} = interface;
      if (family === 'IPv4' && !internal) {
        return address;
      }
    }
  }
  return 'localhost';
}



// Configurer Express.js
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Ajout de la route explicite pour /scanner ---
app.get('/scanner', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'scanner.html'));
});

// Activer CORS pour toutes les requêtes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin',  '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Initialiser les modules avec les chemins de fichiers
campaignsModule.initialize(DATA_FILE);
scansModule.initialize(SCAN_LOG_FILE, DATA_FILE);
statsModule.initialize(SCAN_LOG_FILE, DATA_FILE);
blockchainModule.initialize();

// Routes de base
app.get('/', (req, res) => {
  res.send('Bienvenue sur le serveur QR Tracker ✨');
});

// Routes pour les campagnes
app.get('/campaigns',       campaignsModule.getAllCampaigns);
app.post('/campaignsave',   campaignsModule.saveCampaign);
app.post('/campaigndelete', campaignsModule.deleteCampaign);
app.post('/campaigntoggle', campaignsModule.toggleCampaign);

app.post('/campaignrename', express.json(), (req, res) => {
  const { type, name } = req.body;
  if (!type || !name) return res.status(400).send("Type ou nom manquant");

  const campaignsPath = path.join(__dirname, 'data', 'campaigns.json');
  if (!fs.existsSync(campaignsPath)) return res.status(500).send("Fichier campaigns.json introuvable");

  try {
    const campaigns = JSON.parse(fs.readFileSync(campaignsPath, 'utf-8'));
    const target = campaigns.find(c => c.type === type);
    if (!target) return res.status(404).send("Campagne non trouvée");

    target.name = name;

    fs.writeFileSync(campaignsPath, JSON.stringify(campaigns, null, 2));
    res.send("Nom de campagne mis à jour");
  } catch (err) {
    console.error("Erreur serveur:", err);
    res.status(500).send("Erreur interne serveur");
  }
});


// Routes pour les QR codes
app.post('/qrsave',    campaignsModule.saveQR);
app.post('/qrdelete',  campaignsModule.deleteQR);
app.post('/qrtoggle',  campaignsModule.toggleQR);

app.post('/qrrename', (req, res) => {
  console.log("📩 /qrrename", req.body);
  const { campaign_type, old_location_id, new_location_id } = req.body;
  
  if (!campaign_type || !old_location_id || !new_location_id) {
    return res.status(400).send("❌ Paramètres incomplets");
  }

  // Utiliser les fonctions du module campaigns
  const fs = require('fs');
  const path = require('path');
  const dataFile = path.join(__dirname, 'data', 'campaigns.json');
  
  try {
    // Charger les campagnes
    const campaigns = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const campaign = campaigns.find(c => c.type === campaign_type);
    
    if (!campaign) {
      return res.status(404).send("❌ Campagne introuvable");
    }
    
    // Trouver le QR code
    const qrIndex = campaign.qrs.findIndex(q => 
      (q.location_id === old_location_id) || (q.location === old_location_id)
    );
    
    if (qrIndex === -1) {
      return res.status(404).send("❌ QR code introuvable");
    }
    
    // Mettre à jour le nom
    campaign.qrs[qrIndex].location = new_location_id;
    campaign.qrs[qrIndex].location_id = new_location_id;
    
    // Régénérer l'URL
    const baseUrl = 'http://192.168.42.88:3000';
    campaign.qrs[qrIndex].url = `${baseUrl}/scanner?location_id=${encodeURIComponent(new_location_id)}&scan_type=${encodeURIComponent(campaign.type)}`;
    
    // Sauvegarder
    fs.writeFileSync(dataFile, JSON.stringify(campaigns, null, 2));
    console.log("✅ QR renommé:", old_location_id, "->", new_location_id);
    
    res.send("✅ QR code renommé avec succès");
  } catch (error) {
    console.error("Erreur lors du renommage:", error);
    res.status(500).send("❌ Erreur interne: " + error.message);
  }
});


// route OpenAI pour améliorer les descriptions
app.post("/improve-description", express.json(), async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).send("Texte requis");

  // Vérifier que la clé OpenAI est configurée
  if (!openaiKey) {
    return res.status(500).send("Clé OpenAI non configurée");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: "Tu es un assistant qui améliore les descriptions d'événements pour les rendre plus claires, engageantes et professionnelles." 
          },
          { 
            role: "user", 
            content: `Améliore cette description : ${text}` 
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erreur OpenAI:", errorData);
      throw new Error(`Erreur OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const improved = data.choices?.[0]?.message?.content?.trim();
    
    if (!improved) {
      throw new Error("Réponse OpenAI vide");
    }

    res.json({ improved });
    
  } catch (err) {
    console.error("Erreur OpenAI:", err);
    res.status(500).send("Erreur lors de l'amélioration du texte");
  }
});


// Routes pour les scans
app.get('/scan',     scansModule.processScan);
app.get('/scanlogs', scansModule.getLogs);

// Routes pour les statistiques
app.get('/stats',          statsModule.getStats);
app.get('/stats/timeline', statsModule.getTimelineStats);

// Routes pour la blockchain
app.get('/blockchain-scans', blockchainModule.getBlockchainScans);

