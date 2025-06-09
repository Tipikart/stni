const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Initialisation du module
exports.initialize = function() {
  console.log('Module blockchain initialisé');
};

// Fonction pour déverrouiller le wallet WAX
function unlockWallet(callback) {
  const unlockCmd = `docker exec eosio-node bash -c "cleos wallet unlock --name default --password \\\\$(cat /wax/scripts/wallet.pwd)"`;
  exec(unlockCmd, (err, stdout, stderr) => {
    if (err && !stderr.includes("Already unlocked")) {
      console.error("❌ Échec du déverrouillage du wallet :", stderr || err.message);
      return callback(err);
    }
    console.log("🔓 Wallet prêt ✅");
    callback(null);
  });
}

// Enregistrer un scan sur la blockchain
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
    
    // Ajouter le flag -j pour obtenir la sortie JSON
    const cleosCmd = `docker exec eosio-node cleos push action trackerscan logscan "${args}" -p trackerscan@active -j`;
    
    console.log("[🛰️ CLEOS CMD]", cleosCmd);

    exec(cleosCmd, (err, stdout, stderr) => {
      if (err) {
        console.error('[❌ ERREUR cleos]', stderr || err.message);

        // Parser le message d'erreur EOSIO
        if (stderr) {
          if (stderr.includes("⚠️ Vous avez atteint la limite de scans autorisés") ||
              stderr.includes("atteint la limite")) {
            return callback(new Error("⚠️ Vous avez atteint la limite de scans autorisés pour ce lieu aujourd'hui"));
          }
          if (stderr.includes("déjà été enregistré")) {
            return callback(new Error("⚠️ Vous avez déjà été enregistré pour ce lieu aujourd'hui"));
          }
        }

        return callback(new Error("Erreur blockchain: " + (stderr || err.message)));
      }
      
      console.log('[✅ CLEOS OK]', stdout);
      
      // Parser la sortie JSON pour extraire transaction_id et block_num
      try {
        const result = JSON.parse(stdout);
        
        if (result && result.transaction_id && result.processed) {
          const transactionInfo = {
            transaction_id: result.transaction_id,
            block_num: result.processed.block_num
          };
          
          console.log("Transaction blockchain:", transactionInfo);
          return callback(null, transactionInfo);
        } else {
          // Si pas de format JSON, essayer de parser la sortie texte
          const txMatch = stdout.match(/executed transaction: ([a-f0-9]+)/i);
          const blockMatch = stdout.match(/#\s*(\d+)/);
          
          const transactionInfo = {
            transaction_id: txMatch ? txMatch[1] : null,
            block_num: blockMatch ? parseInt(blockMatch[1]) : null
          };
          
          console.log("Transaction blockchain (parsed):", transactionInfo);
          return callback(null, transactionInfo);
        }
      } catch (parseErr) {
        console.error("Erreur parsing résultat JSON:", parseErr);
        
        // Fallback : parser la sortie texte
        const txMatch = stdout.match(/executed transaction: ([a-f0-9]+)/i);
        const blockMatch = stdout.match(/#\s*(\d+)/);
        
        const transactionInfo = {
          transaction_id: txMatch ? txMatch[1] : null,
          block_num: blockMatch ? parseInt(blockMatch[1]) : null
        };
        
        if (transactionInfo.transaction_id || transactionInfo.block_num) {
          console.log("Transaction blockchain (fallback):", transactionInfo);
          return callback(null, transactionInfo);
        }
        
        // Si rien n'est trouvé, retourner succès sans détails
        return callback(null, true);
      }
    });
  });
};

// Récupérer les scans depuis la blockchain
exports.getBlockchainScans = function(req, res) {
  console.log("📩 /blockchain-scans");

  const { scan_type, location_id } = req.query;
  console.log("Paramètres reçus:", { scan_type, location_id });

  if (!scan_type && !location_id) {
    return res.status(400).json({ error: 'Veuillez spécifier au moins scan_type ou location_id' });
  }

  // D'abord, charger les scan logs locaux
  const DATA_DIR = path.join(__dirname, '..', 'data');
  const scanLogsPath = path.join(DATA_DIR, 'scanlogs.json');
  
  let scanLogs = [];
  if (fs.existsSync(scanLogsPath)) {
    try {
      scanLogs = JSON.parse(fs.readFileSync(scanLogsPath, 'utf8'));
      console.log(`Nombre de logs locaux trouvés: ${scanLogs.length}`);
    } catch (logsErr) {
      console.error("Erreur lecture scanlogs:", logsErr);
    }
  }

  // Vérifier d'abord si EOSIO est actif
  exec('docker ps --filter "name=eosio-node" --filter "status=running" --format "{{.Names}}"', (err, stdout, stderr) => {
    const isEosioRunning = stdout.trim() === 'eosio-node';
    
    if (!isEosioRunning) {
      console.log("⚠️ EOSIO n'est pas actif - utilisation des données locales");
      
      // Filtrer les logs locaux selon les critères
      let filteredLogs = scanLogs;
      if (scan_type) {
        filteredLogs = filteredLogs.filter(log => log.scan_type === scan_type);
      }
      if (location_id) {
        filteredLogs = filteredLogs.filter(log => log.location_id === location_id);
      }
      
      // Convertir au format blockchain
      const rows = filteredLogs.map((log, index) => ({
        id: index,
        uuid: log.uuid,
        location_id: log.location_id,
        scan_type: log.scan_type,
        timestamp: new Date(log.timestamp * 1000).toISOString(),
        day_id: parseInt(new Date(log.timestamp * 1000).toISOString().slice(0,10).replace(/-/g,'')),
        transaction_id: log.transaction_id || null,
        block_num: log.block_num || null
      }));
      
      return res.json({
        rows: rows,
        more: false,
        timestamp: new Date().toISOString(),
        source: "local_logs"
      });
    }

    // Si EOSIO est actif, essayer de récupérer les vraies données
    const cleosCmd = `docker exec eosio-node cleos get table trackerscan trackerscan scans --limit 100`;
    
    exec(cleosCmd, (err, stdout, stderr) => {
      if (err) {
        console.error("❌ Erreur cleos:", stderr || err.message);
        
        // En cas d'erreur, utiliser les données locales
        let filteredLogs = scanLogs;
        if (scan_type) {
          filteredLogs = filteredLogs.filter(log => log.scan_type === scan_type);
        }
        if (location_id) {
          filteredLogs = filteredLogs.filter(log => log.location_id === location_id);
        }
        
        const rows = filteredLogs.map((log, index) => ({
          id: index,
          uuid: log.uuid,
          location_id: log.location_id,
          scan_type: log.scan_type,
          timestamp: new Date(log.timestamp * 1000).toISOString(),
          day_id: parseInt(new Date(log.timestamp * 1000).toISOString().slice(0,10).replace(/-/g,'')),
          transaction_id: log.transaction_id || null,
          block_num: log.block_num || null
        }));
        
        return res.json({
          rows: rows,
          more: false,
          timestamp: new Date().toISOString(),
          source: "local_logs",
          error: "Erreur blockchain, données locales utilisées"
        });
      }

      try {
        const result = JSON.parse(stdout);
        console.log("Résultat blockchain brut:", JSON.stringify(result, null, 2));
        
        // Si la blockchain est vide mais qu'on a des logs locaux, utiliser les logs
        if ((!result.rows || result.rows.length === 0) && scanLogs.length > 0) {
          console.log("Blockchain vide, utilisation des logs locaux");
          
          let filteredLogs = scanLogs;
          if (scan_type) {
            filteredLogs = filteredLogs.filter(log => log.scan_type === scan_type);
          }
          if (location_id) {
            filteredLogs = filteredLogs.filter(log => log.location_id === location_id);
          }
          
          const rows = filteredLogs.map((log, index) => ({
            id: index,
            uuid: log.uuid,
            location_id: log.location_id,
            scan_type: log.scan_type,
            timestamp: new Date(log.timestamp * 1000).toISOString(),
            day_id: parseInt(new Date(log.timestamp * 1000).toISOString().slice(0,10).replace(/-/g,'')),
            transaction_id: log.transaction_id || null,
            block_num: log.block_num || null
          }));
          
          return res.json({
            rows: rows,
            more: false,
            timestamp: new Date().toISOString(),
            source: "local_logs",
            message: "Blockchain vide, données locales affichées"
          });
        }
        
        // Si on a des données blockchain, les enrichir avec les infos locales
        let filteredRows = result.rows || [];
        
        if (scan_type) {
          filteredRows = filteredRows.filter(row => row.scan_type === scan_type);
        }
        if (location_id) {
          filteredRows = filteredRows.filter(row => row.location_id === location_id);
        }
        
        // Enrichir avec les infos de transaction depuis scanlogs
        filteredRows = filteredRows.map(row => {
          const blockchainTimestamp = Math.floor(new Date(row.timestamp).getTime() / 1000);
          
          const matchingLog = scanLogs.find(log => {
            const sameUuid = log.uuid === row.uuid;
            const sameLocation = log.location_id === row.location_id;
            const sameType = log.scan_type === row.scan_type;
            const timeDiff = Math.abs(blockchainTimestamp - log.timestamp);
            const timeMatch = timeDiff <= 5;
            
            return sameUuid && sameLocation && sameType && timeMatch;
          });
          
          if (matchingLog) {
            if (matchingLog.transaction_id) {
              row.transaction_id = matchingLog.transaction_id;
            }
            if (matchingLog.block_num) {
              row.block_num = matchingLog.block_num;
            }
          }
          
          return row;
        });
        
        console.log(`✅ ${filteredRows.length} résultats trouvés`);
        
        res.json({
          rows: filteredRows,
          more: result.more || false,
          timestamp: new Date().toISOString(),
          source: "blockchain"
        });
      } catch (parseErr) {
        console.error("❌ Erreur parsing résultat blockchain:", parseErr);
        
        // En cas d'erreur, utiliser les données locales
        let filteredLogs = scanLogs;
        if (scan_type) {
          filteredLogs = filteredLogs.filter(log => log.scan_type === scan_type);
        }
        if (location_id) {
          filteredLogs = filteredLogs.filter(log => log.location_id === location_id);
        }
        
        const rows = filteredLogs.map((log, index) => ({
          id: index,
          uuid: log.uuid,
          location_id: log.location_id,
          scan_type: log.scan_type,
          timestamp: new Date(log.timestamp * 1000).toISOString(),
          day_id: parseInt(new Date(log.timestamp * 1000).toISOString().slice(0,10).replace(/-/g,'')),
          transaction_id: log.transaction_id || null,
          block_num: log.block_num || null
        }));
        
        res.json({
          rows: rows,
          more: false,
          timestamp: new Date().toISOString(),
          source: "local_logs",
          error: "Erreur parsing, données locales utilisées"
        });
      }
    });
  });
}; 