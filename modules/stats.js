const fs = require('fs');
const path = require('path');

let scanLogFile = '';
let campaignsFile = '';

// Initialisation du module
exports.initialize = function(logFilePath, campaignsFilePath) {
  scanLogFile = logFilePath;
  campaignsFile = campaignsFilePath;
  console.log('Module de statistiques initialisé avec:', scanLogFile);
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

// Obtenir les statistiques générales
exports.getStats = function(req, res) {
  try {
    const campaignsData = loadCampaigns();
    const logsData = fs.existsSync(scanLogFile)
      ? JSON.parse(fs.readFileSync(scanLogFile, 'utf8'))
      : [];
    
    console.log("📊 Logs chargés:", logsData.length);
    
    const stats = {};
    
    campaignsData.forEach(campaign => {
      const campaignStats = {
        total: 0,          // Nombre d'utilisateurs uniques
        totalScans: 0,     // Nombre total de scans
        qrs: {},
        qrsScans: {}       // Nouveau: scans totaux par QR
      };
      
      console.log(`Traitement campagne: ${campaign.type} avec ${campaign.qrs?.length || 0} QR codes`);
      
      // Compter tous les scans pour cette campagne
      const campaignScans = logsData.filter(log => log.scan_type === campaign.type);
      campaignStats.totalScans = campaignScans.length;
      
      // Compter les visiteurs uniques (UUID distincts)
      const campaignUniqueVisitors = new Set(campaignScans.map(scan => scan.uuid));
      campaignStats.total = campaignUniqueVisitors.size;
      
      // Traiter chaque QR code
      (campaign.qrs || []).forEach(qr => {
        const locationId = qr.location_id || qr.location;
        
        // Initialiser les compteurs pour ce QR
        campaignStats.qrs[locationId] = 0;
        campaignStats.qrsScans[locationId] = 0;
        
        // Tous les scans pour ce QR spécifique
        const qrScans = logsData.filter(log => {
          return log.scan_type === campaign.type && log.location_id === locationId;
        });
        
        // Compter les scans totaux pour ce QR
        campaignStats.qrsScans[locationId] = qrScans.length;
        
        // Compter les visiteurs uniques pour ce QR
        const uniqueUuids = new Set(qrScans.map(scan => scan.uuid));
        campaignStats.qrs[locationId] = uniqueUuids.size;
      });
      
      stats[campaign.type] = campaignStats;
    });
    
    res.json(stats);
  } catch (err) {
    console.error("Erreur lecture stats:", err);
    res.status(500).json({ error: 'Impossible de charger les statistiques: ' + err.message });
  }
};

// Obtenir les statistiques temporelles
exports.getTimelineStats = function(req, res) {
  try {
    const { type, location_id, start_date, end_date } = req.query;
    
    console.log("📊 Paramètres reçus pour timeline:", { type, location_id, start_date, end_date });
    
    if (!type || !location_id) {
      return res.status(400).json({ error: 'Les paramètres type et location_id sont requis' });
    }
    
    // Vérifier si le fichier de logs existe
    if (!fs.existsSync(scanLogFile)) {
      console.log("⚠️ Fichier de logs non trouvé");
      return res.json({ 
        daily: [], 
        weekly: [], 
        monthly: [], 
        yearly: [], 
        total: 0 
      });
    }
    
    // Charger tous les logs
    const logsData = JSON.parse(fs.readFileSync(scanLogFile, 'utf8'));
    console.log(`📝 Total des logs: ${logsData.length}`);
    
    // Filtrer les logs pour ce QR code et cette campagne
    const qrLogs = logsData.filter(log => 
      log.scan_type === type && log.location_id === location_id
    );
    
    console.log(`🔍 Logs filtrés pour ${type}/${location_id}: ${qrLogs.length}`);
    
    // Ajouter ce debug pour voir les premiers logs
    if (qrLogs.length > 0) {
      console.log("🔍 Échantillon des logs pour ce QR:", qrLogs.slice(0, 3).map(log => ({
        scan_type: log.scan_type,
        location_id: log.location_id,
        timestamp: log.timestamp,
        date: new Date(log.timestamp * 1000).toISOString()
      })));
    }
    
    // Convertir les timestamps Unix en dates JavaScript et filtrer
    const dateFilteredLogs = qrLogs.filter(log => {
      const scanDate = new Date(log.timestamp * 1000);
      
      if (start_date && end_date) {
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(end_date);
        endDateObj.setHours(23, 59, 59, 999);
        
        return scanDate >= startDateObj && scanDate <= endDateObj;
      }
      
      return true;
    });
    
    console.log(`📅 Logs après filtrage par date: ${dateFilteredLogs.length}`);
    
    // Regrouper par date
    const dailyStats = {};
    const weeklyStats = {};
    const monthlyStats = {};
    const yearlyStats = {};
    
    dateFilteredLogs.forEach(log => {
      const date = new Date(log.timestamp * 1000);
      
      // Format YYYY-MM-DD pour les statistiques quotidiennes
      const dayKey = date.toISOString().split('T')[0];
      
      // Format YYYY-[W]WW pour les statistiques hebdomadaires
      const weekNumber = getWeekNumber(date);
      const weekKey = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
      
      // Format YYYY-MM pour les statistiques mensuelles
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      // Format YYYY pour les statistiques annuelles
      const yearKey = date.getFullYear().toString();
      
      // Compter par jour
      if (!dailyStats[dayKey]) dailyStats[dayKey] = 0;
      dailyStats[dayKey]++;
      
      // Compter par semaine
      if (!weeklyStats[weekKey]) weeklyStats[weekKey] = 0;
      weeklyStats[weekKey]++;
      
      // Compter par mois
      if (!monthlyStats[monthKey]) monthlyStats[monthKey] = 0;
      monthlyStats[monthKey]++;
      
      // Compter par année
      if (!yearlyStats[yearKey]) yearlyStats[yearKey] = 0;
      yearlyStats[yearKey]++;
    });
    
    // Trier les clés par ordre chronologique
    const sortedDailyKeys = Object.keys(dailyStats).sort();
    const sortedWeeklyKeys = Object.keys(weeklyStats).sort();
    const sortedMonthlyKeys = Object.keys(monthlyStats).sort();
    const sortedYearlyKeys = Object.keys(yearlyStats).sort();
    
    // Formater les données pour le graphique
    const timelineData = {
      daily: sortedDailyKeys.map(key => ({ date: key, count: dailyStats[key] })),
      weekly: sortedWeeklyKeys.map(key => ({ date: key, count: weeklyStats[key] })),
      monthly: sortedMonthlyKeys.map(key => ({ date: key, count: monthlyStats[key] })),
      yearly: sortedYearlyKeys.map(key => ({ date: key, count: yearlyStats[key] })),
      total: dateFilteredLogs.length
    };
    
    console.log("📊 Données timeline finales:", {
      daily: timelineData.daily.length,
      weekly: timelineData.weekly.length,
      monthly: timelineData.monthly.length,
      yearly: timelineData.yearly.length,
      total: timelineData.total
    });
    
    res.json(timelineData);
  } catch (err) {
    console.error("❌ Erreur lors de la génération des statistiques temporelles:", err);
    res.status(500).json({ error: 'Impossible de générer les statistiques: ' + err.message });
  }
};

// Fonction utilitaire pour calculer le numéro de semaine d'une date
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}