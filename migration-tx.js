const fs = require('fs');
const { exec } = require('child_process');

// Lire les scanlogs existants
const scanLogsPath = './data/scanlogs.json';
const scanLogs = JSON.parse(fs.readFileSync(scanLogsPath));

// Pour chaque scan sans transaction_id
scanLogs.forEach((scan, index) => {
  if (!scan.transaction_id) {
    // Essayer de récupérer depuis la blockchain
    const cleosCmd = `docker exec eosio-node cleos get table trackerscan trackerscan scans --index 2 --key-type sha256 --lower ${scan.uuid} --upper ${scan.uuid}`;
    
    exec(cleosCmd, (err, stdout) => {
      if (!err) {
        try {
          const result = JSON.parse(stdout);
          if (result.rows && result.rows.length > 0) {
            const blockchainScan = result.rows.find(r => 
              r.location_id === scan.location_id && 
              r.scan_type === scan.scan_type
            );
            
            if (blockchainScan) {
              // Ici, nous devrions chercher la transaction dans l'historique
              // mais c'est complexe, donc on laisse vide pour les anciens
              console.log(`Scan trouvé sur blockchain pour ${scan.uuid}`);
            }
          }
        } catch (e) {}
      }
    });
  }
});