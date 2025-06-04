const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const blockchainModule = require('./blockchain');

let scanLogFile = '';
let campaignsFile = '';

// Initialisation du module
exports.initialize = function(logFilePath, campaignsFilePath) {
  scanLogFile = logFilePath;
  campaignsFile = campaignsFilePath;
  console.log('Module de gestion des scans initialisé avec:', scanLogFile);
};

// Charger les campagnes
function loadCampaigns() {
  try {
    if (fs.existsSync(campaignsFile)) {
      return JSON.parse(fs.readFileSync(campaignsFile));
    } else {
      return [];
    }
  } catch (err) {
    console.error("❌ Erreur de lecture campaigns.json :", err);
    return [];
  }
}

// Récupérer les logs de scan
exports.getLogs = function(req, res) {
  console.log("📩 /scanlogs");
  
  try {
    // Vérifier si le fichier de logs existe
    if (fs.existsSync(scanLogFile)) {
      const logs = JSON.parse(fs.readFileSync(scanLogFile, 'utf8'));
      
      // Options de filtrage (facultatives)
      const { type, location, from, to } = req.query;
      
      let filteredLogs = logs;
      
      // Filtrer par type de campagne
      if (type) {
        filteredLogs = filteredLogs.filter(log => log.scan_type === type);
      }
      
      // Filtrer par lieu
      if (location) {
        filteredLogs = filteredLogs.filter(log => log.location_id === location);
      }
      
      // Filtrer par date de début
      if (from) {
        const fromTimestamp = new Date(from).getTime() / 1000;
        filteredLogs = filteredLogs.filter(log => log.timestamp >= fromTimestamp);
      }
      
      // Filtrer par date de fin
      if (to) {
        const toTimestamp = new Date(to).getTime() / 1000;
        filteredLogs = filteredLogs.filter(log => log.timestamp <= toTimestamp);
      }
      
      console.log(`Logs filtrés: ${filteredLogs.length}/${logs.length}`);
      
      res.json(filteredLogs);
    } else {
      console.log("⚠️ Fichier de logs non trouvé");
      res.json([]);
    }
  } catch (err) {
    console.error("❌ Erreur lors de la lecture des logs:", err);
    res.status(500).json({ error: 'Impossible de charger les logs: ' + err.message });
  }
};

// Traiter un nouveau scan
// Traiter un nouveau scan
exports.processScan = function(req, res) {
  const data = {
    uuid: req.query.uuid || uuidv4(),
    location_id: req.query.location_id || 'undefined',
    scan_type: req.query.scan_type || 'undefined',
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  console.log("[GET] Scan reçu :", data);
  
  // Vérification état campagne / QR
  const allCampaigns = loadCampaigns();
  const campaign = allCampaigns.find(c => c.type === data.scan_type);
  if (!campaign || campaign.enabled === false) {
    return res.status(403).send("Ce qr code a été désactivé");
  }
  
  const qrItem = campaign.qrs.find(q =>
    (q.location_id === data.location_id) || (q.location === data.location_id)
  );
  
  if (!qrItem || qrItem.enabled === false) {
    return res.status(403).send("Ce qr code a été désactivé");
  }
  
  // Charger les logs existants
  let logs = [];
  try {
    if (fs.existsSync(scanLogFile)) {
      logs = JSON.parse(fs.readFileSync(scanLogFile, 'utf8'));
    }
  } catch (e) {
    console.error("Erreur lecture scanlogs.json :", e);
    logs = [];
  }
  
  // Vérifier le nombre max de scans autorisés par UUID
  const mode = qrItem.mode || 'passage';
  
  if (mode === 'passage') {
    const maxScans = qrItem.max_scans_per_uuid || 1;
    const matchingScans = logs.filter(log =>
      log.uuid === data.uuid &&
      log.scan_type === data.scan_type &&
      log.location_id === data.location_id
    );
    
    if (matchingScans.length >= maxScans) {
      return res.status(409).send(`⚠️ Limite de ${maxScans} scan(s) atteinte pour ce code`);
    }
  }
  
  if (mode === 'presence') {
    const presence = qrItem.presence || {};
    const now = new Date();
    
    // Vérification plage horaire
    const start = new Date(`${presence.date_debut}T${presence.heure_debut}`);
    const end = new Date(`${presence.date_fin}T${presence.heure_fin}`);
    if (now < start || now > end) {
      return res.status(403).send("⏱️ Ce QR n'est pas valide actuellement (hors plage horaire)");
    }
    
    // Tous les scans pour ce QR
    const scans = logs.filter(log =>
      log.scan_type === data.scan_type &&
      log.location_id === data.location_id
    );
    
    // Filtrer les UUID uniques
    const uniqueUUIDs = new Set(scans.map(s => s.uuid));
    
    // Si nombre de personnes dépassé et cet UUID n'est pas encore dedans : refus
    const uuidAlreadyUsed = uniqueUUIDs.has(data.uuid);
    if (!uuidAlreadyUsed && uniqueUUIDs.size >= presence.nombre_personnes) {
      return res.status(409).send("⚠️ Nombre maximum de personnes atteint pour ce QR");
    }
    
    // Compter combien de fois cet UUID a scanné ce QR
    const countForUUID = scans.filter(s => s.uuid === data.uuid).length;
    if (countForUUID >= 2) {
      return res.status(409).send("⚠️ Vous avez déjà scanné 2 fois ce QR de présence");
    }
  }
  
  // Enregistrer le scan sur la blockchain
blockchainModule.recordScanOnBlockchain({
  ...data,
  max_scans_per_uuid: qrItem.max_scans_per_uuid || 1,
  mode: mode
}, (err, blockchainResult) => {
  if (err) {
    // Si c'est une erreur de limite de scans, ne pas enregistrer localement
    if (err.message && (
        err.message.includes("Limite de scans atteinte") || 
        err.message.includes("atteint la limite") ||
        err.message.includes("Vous avez déjà scanné")
      )) {
      return res.status(409).send(err.message);
    }
    
    // Pour toute autre erreur blockchain, continuer quand même
    console.error("Erreur blockchain (non fatale):", err.message);
  }
  
  // Préparer l'objet scan à enregistrer
  const scanLog = {
    uuid: data.uuid,
    location_id: data.location_id,
    scan_type: data.scan_type,
    timestamp: data.timestamp,
    blockchain_status: err ? 'failed' : 'success'
  };
  
  // Ajouter les infos de transaction si disponibles
  if (blockchainResult && typeof blockchainResult === 'object') {
    if (blockchainResult.transaction_id) {
      scanLog.transaction_id = blockchainResult.transaction_id;
    }
    if (blockchainResult.block_num) {
      scanLog.block_num = blockchainResult.block_num;
    }
  }
  
  // Si erreur blockchain, enregistrer le message
  if (err) {
    scanLog.blockchain_error = err.message;
  }
  
  // Ajouter aux logs
  logs.push(scanLog);
  
  try {
    fs.writeFileSync(scanLogFile, JSON.stringify(logs, null, 2));
    console.log("📁 Scan ajouté dans scanlogs.json avec infos blockchain");
  } catch (e) {
    console.error("Erreur écriture scanlogs.json :", e);
  }
  
  // Retourner le succès
  return res.send("✅ Scan enregistré avec succès !");
});












  
exports.recordScanOnBlockchain = function(data, callback) {
  unlockWallet((unlockErr) => {
    if (unlockErr) {
      console.error("Erreur unlock wallet:", unlockErr);
      return callback(new Error("❌ Wallet verrouillé - scan annulé"));
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const max = data.max_scans_per_uuid || 1;
    const mode = data.mode || 'passage';

    const argsArray = [
      data.uuid,
      data.location_id,
      data.scan_type,
      max,
      timestamp,
      "",       // scan_state (vide)
      mode      // "passage" ou "presence"
    ];

    const args = JSON.stringify(argsArray).replace(/"/g, '\\"');
    const cleosCmd = `docker exec eosio-node cleos push action trackerscan logscan "${args}" -p trackerscan@active`;
    
    console.log("[🛰️ CLEOS CMD]", cleosCmd);

    exec(cleosCmd, (err, stdout, stderr) => {
      if (err) {
        console.error('[❌ ERREUR cleos]', stderr || err.message);

        if (stderr && (
          stderr.includes("Déjà scanné") ||
          stderr.includes("assertion failure") ||
          stderr.includes("already scanned") ||
          stderr.includes("atteint la limite")
        )) {
          return callback(new Error("Limite de scans atteinte pour ce lieu aujourd'hui"));
        }

        return callback(new Error("Erreur cleos: " + (stderr || err.message)));
      }
      
      console.log('[✅ CLEOS OK]', stdout);
      
      // Parser la sortie pour extraire le transaction_id
      try {
        const txMatch = stdout.match(/executed transaction: ([a-f0-9]+)/i);
        const blockMatch = stdout.match(/\#\s*(\d+)/);
        
        const result = {
          transaction_id: txMatch ? txMatch[1] : null,
          block_num: blockMatch ? blockMatch[1] : null
        };
        
        console.log("Transaction blockchain:", result);
        return callback(null, result);
      } catch (parseErr) {
        console.error("Erreur parsing résultat:", parseErr);
        return callback(null, true); // Succès sans détails
      }
    });
  });
};
};