const fs = require('fs');
const path = require('path');

let dataFile = '';

// Initialisation du module
exports.initialize = function(filePath) {
  dataFile = filePath;
  console.log('Module de gestion des campagnes initialisé avec:', dataFile);
};

// Charger les campagnes
function loadCampaigns() {
  try {
    if (fs.existsSync(dataFile)) {
      console.log("📄 Chargement des données depuis:", dataFile);
      const data = JSON.parse(fs.readFileSync(dataFile));
      console.log(`📊 ${data.length} campagnes chargées`);
      return data;
    } else {
      console.log("⚠️ Fichier de données non trouvé, création d'un nouveau fichier");
      fs.writeFileSync(dataFile, JSON.stringify([]));
      return [];
    }
  } catch (err) {
    console.error("❌ Erreur de lecture campaigns.json :", err);
    return [];
  }
}

// Sauvegarder les campagnes
function saveCampaigns(data) {
  try {
    console.log("💾 Sauvegarde de", data.length, "campagnes dans", dataFile);
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
    console.log("✅ campaigns.json mis à jour !");
  } catch (err) {
    console.error("❌ Échec de l'écriture dans campaigns.json :", err);
  }
}

// Obtenir toutes les campagnes
exports.getAllCampaigns = function(req, res) {
  console.log("📩 /campaigns");
  console.log("Requête reçue depuis:", req.headers.origin || "origine inconnue");
  res.json(loadCampaigns());
};

// Enregistrer une nouvelle campagne
exports.saveCampaign = function(req, res) {
  console.log("📩 /campaignsave", req.body);
  const newCampaign = req.body;
  if (!newCampaign || !newCampaign.name || !newCampaign.type) {
    return res.status(400).send("❌ Données invalides");
  }

  const campaigns = loadCampaigns();
  if (!campaigns.find(c => c.type === newCampaign.type)) {
    campaigns.push({ ...newCampaign, enabled: true, qrs: newCampaign.qrs || [] });

    saveCampaigns(campaigns);
    return res.send("✅ Campagne enregistrée");
  } else {
    return res.send("⚠️ Campagne déjà existante");
  }
};

// Supprimer une campagne
exports.deleteCampaign = function(req, res) {
  console.log("📩 /campaigndelete", req.body);
  const { type } = req.body;
  
  if (!type) {
    return res.status(400).send("❌ Type de campagne manquant");
  }

  // Charger les campagnes
  const campaigns = loadCampaigns();
  
  // Trouver et supprimer la campagne
  const campaignIndex = campaigns.findIndex(c => c.type === type);
  if (campaignIndex === -1) {
    return res.status(404).send("❌ Campagne introuvable");
  }
  
  // Supprimer la campagne
  campaigns.splice(campaignIndex, 1);
  
  // Sauvegarder les modifications
  saveCampaigns(campaigns);
  
  res.send("✅ Campagne supprimée avec succès");
};

// Activer/désactiver une campagne
exports.toggleCampaign = function(req, res) {
  const { type, enabled } = req.body;
  if (!type || typeof enabled !== 'boolean')
    return res.status(400).send('❌ Paramètres incomplets pour activer/désactiver la campagne');
    
  const campaigns = loadCampaigns();
  const camp = campaigns.find(c => c.type === type);
  if (!camp) return res.status(404).send('❌ Campagne introuvable');
  
  camp.enabled = enabled;
  camp.qrs.forEach(q => q.enabled = enabled);
  saveCampaigns(campaigns);
  
  return res.send(`✅ Campagne ${enabled ? 'activée' : 'désactivée'} avec succès`);
};

// Ajouter un nouveau QR code
exports.saveQR = function(req, res) {
  console.log("📩 /qrsave", req.body);
  const newQR = req.body;
  
  if (!newQR || !newQR.location || !newQR.url || !newQR.scan_type) {
    return res.status(400).send("❌ Données QR invalides");
  }

  const campaigns = loadCampaigns();
  const campaign = campaigns.find(c => c.type === newQR.scan_type);
  if (!campaign) return res.status(404).send("❌ Campagne introuvable");

  // IMPORTANT: S'assurer que l'URL est complète
  const baseUrl = 'http://192.168.42.88:3000'; // Votre IPconst baseUrl = process.env.NODE_ENV === 'production' ? 'https://stni.onrender.com' : 'http://localhost:3000';  
  const qrToSave = {
    location: newQR.location,
    location_id: newQR.location_id,
    url: newQR.url.startsWith('http') ? newQR.url : `${baseUrl}${newQR.url}`,
    scan_type: newQR.scan_type,
    enabled: true,
    created_at: new Date().toISOString(),
    mode: newQR.mode || 'passage'
  };

if (qrToSave.mode === 'passage') {
  qrToSave.max_scans_per_uuid = parseInt(newQR.max_scans_per_uuid || '1', 10);
}

if (qrToSave.mode === 'presence') {
  qrToSave.presence = {
    nombre_personnes: parseInt(newQR.presence?.nombre_personnes || '1', 10),
    date_debut: newQR.presence?.date_debut || '',
    heure_debut: newQR.presence?.heure_debut || '',
    date_fin: newQR.presence?.date_fin || '',
    heure_fin: newQR.presence?.heure_fin || ''
  };
}

campaign.qrs.push(qrToSave);


  saveCampaigns(campaigns);
  res.send("✅ QR enregistré avec succès");
};

// Supprimer un QR code
exports.deleteQR = function(req, res) {
  console.log("📩 /qrdelete", req.body);
  const { campaign_type, location_id } = req.body;
  
  if (!campaign_type || !location_id) {
    return res.status(400).send("❌ Paramètres incomplets");
  }

  const campaigns = loadCampaigns();
  const campaignIndex = campaigns.findIndex(c => c.type === campaign_type);
  if (campaignIndex === -1) {
    return res.status(404).send("❌ Campagne introuvable");
  }
  
  const campaign = campaigns[campaignIndex];
  const qrIndex = campaign.qrs.findIndex(q => 
    (q.location_id === location_id) || (q.location === location_id)
  );
  
  if (qrIndex === -1) {
    return res.status(404).send("❌ QR code introuvable");
  }
  
  campaign.qrs.splice(qrIndex, 1);
  saveCampaigns(campaigns);
  
  res.send("✅ QR code supprimé avec succès");
};

// Activer/désactiver un QR code
exports.toggleQR = function(req, res) {
  const { campaign_type, location_id, enabled } = req.body;
  if (!campaign_type || !location_id || typeof enabled !== 'boolean')
    return res.status(400).send('❌ Paramètres incomplets pour activer/désactiver le QR');
    
  const campaigns = loadCampaigns();
  const camp = campaigns.find(c => c.type === campaign_type);
  if (!camp) return res.status(404).send('❌ Campagne introuvable');
  
  const qr = camp.qrs.find(q =>
    (q.location_id === location_id) || (q.location === location_id)
  );
  if (!qr) return res.status(404).send('❌ QR code introuvable');
  
  qr.enabled = enabled;
  saveCampaigns(campaigns);
  
  return res.send(`✅ QR code ${enabled ? 'activé' : 'désactivé'} avec succès`);
};