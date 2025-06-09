// Configuration et presets

// Activer/désactiver le débogage
window.DEBUG = window.DEBUG || false;

// Modules disponibles dans l'application
const availableModules = {
  campaignManager: {
    name: "Gestionnaire de campagnes",
    required: true,
    options: {
      maxCampaigns: 50,
      allowDelete: true,
      allowExport: true,
      buttons: {
        exportJSON: true,
        exportPDF: true,
        stats: true,
        blockchain: true
      }
    }
  },
  qrManager: {
    name: "Gestionnaire de QR codes",
    required: true,
    options: {
      maxQRPerCampaign: 100,
      allowCustomDesign: false,
      buttons: {
        exportJSON: true,
        exportPDF: true,
        stats: true
      }
    }
  },
  statsModule: {
    name: "Module de statistiques",
    required: false,
    options: {
      enableCharts: true,
      realTimeUpdate: false,
      colors: ['#4CAF50','#2196F3','#FFC107','#E91E63','#9C27B0']
    }
  }
};

// Présets sectoriels
const sectorPresets = {
  standard: {
    name: "Configuration standard",
    modules: {
      campaignManager: {
        ...availableModules.campaignManager.options,
        buttons: {
          exportJSON: true,
          exportPDF: true,
          stats: true,
          blockchain: true
        }
      },
      qrManager: {
        ...availableModules.qrManager.options,
        buttons: {
          exportJSON: true,
          exportPDF: true,
          stats: true
        }
      },
      statsModule: availableModules.statsModule.options
    }
  },
  retail: {
    name: "Commerce de détail",
    modules: {
      campaignManager: {
        ...availableModules.campaignManager.options,
        buttons: {
          exportJSON: true,
          exportPDF: true,
          stats: true,
          blockchain: false
        }
      },
      qrManager: {
        ...availableModules.qrManager.options,
        maxQRPerCampaign: 200,
        buttons: {
          exportJSON: true,
          exportPDF: true,
          stats: true
        }
      },
      statsModule: {
        ...availableModules.statsModule.options,
        enableCharts: true,
        realTimeUpdate: true
      }
    }
  }
};

// Configuration actuelle
let currentConfig = JSON.parse(localStorage.getItem('appConfig')) || {
  "name": "Configuration standard",
  "modules": {
    "campaignManager": { 
      ...availableModules.campaignManager.options,
      buttons: {
        exportJSON: false,
        exportPDF: false,
        stats: false,
        blockchain: false
      }
    },
    "qrManager": { 
      ...availableModules.qrManager.options,
      buttons: {
        exportJSON: false,
        exportPDF: false,
        stats: false
      }
    },
    "statsModule": availableModules.statsModule.options
  }
};

// Fonction pour appliquer une configuration
function applyConfiguration() {
  // Fonction à implémenter selon vos besoins
  console.log("Configuration appliquée:", currentConfig);
  
  // Exemple : masquer/afficher des boutons selon la configuration
  if (currentConfig.modules.campaignManager) {
    const buttons = currentConfig.modules.campaignManager.buttons;
    
    // Masquer/afficher les boutons selon la configuration
    const exportJSONBtn = document.querySelector('.btn[onclick*="exportJSON"]');
    if (exportJSONBtn) {
      exportJSONBtn.style.display = buttons.exportJSON ? 'inline-flex' : 'none';
    }
    
    const exportPDFBtn = document.querySelector('.btn[onclick*="exportPDF"]');
    if (exportPDFBtn) {
      exportPDFBtn.style.display = buttons.exportPDF ? 'inline-flex' : 'none';
    }
  }
}

// Fonction pour charger une configuration
function loadConfiguration(name) {
  const savedConfigs = JSON.parse(localStorage.getItem('savedConfigs')) || {};
  if (savedConfigs[name]) {
    currentConfig = savedConfigs[name];
    localStorage.setItem('appConfig', JSON.stringify(currentConfig));
    applyConfiguration();
    showStatus(`Configuration "${name}" chargée !`);
  }
}

// Fonction pour sauvegarder une configuration
function saveConfiguration(name) {
  const savedConfigs = JSON.parse(localStorage.getItem('savedConfigs')) || {};
  savedConfigs[name] = currentConfig;
  localStorage.setItem('savedConfigs', JSON.stringify(savedConfigs));
  showStatus(`Configuration "${name}" sauvegardée !`);
}

// Fonction pour appliquer une configuration de secteur
function applySectorPreset(sector) {
  if (sectorPresets[sector]) {
    currentConfig = {
      "name": sectorPresets[sector].name,
      "modules": {}
    };
    
    // Appliquer tous les modules du preset
    for (const [moduleName, moduleConfig] of Object.entries(sectorPresets[sector].modules)) {
      currentConfig.modules[moduleName] = {...moduleConfig};
    }
    
    // S'assurer que les modules requis sont inclus
    for (const [moduleName, moduleInfo] of Object.entries(availableModules)) {
      if (moduleInfo.required && !currentConfig.modules[moduleName]) {
        currentConfig.modules[moduleName] = {...moduleInfo.options};
      }
    }
    
    applyConfiguration();
    showStatus(`Configuration "${sectorPresets[sector].name}" appliquée !`);
  }
}

// Fonction utilitaire pour afficher les statuts (si pas définie ailleurs)
function showStatus(message) {
  const statusDiv = document.getElementById('status-message');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
  console.log(message);
}

// Exporter les fonctions et variables globales
window.currentConfig = currentConfig;
window.availableModules = availableModules;
window.sectorPresets = sectorPresets;
window.loadConfiguration = loadConfiguration;
window.saveConfiguration = saveConfiguration;
window.applySectorPreset = applySectorPreset;
window.applyConfiguration = applyConfiguration;

// Initialiser la configuration au chargement
document.addEventListener('DOMContentLoaded', function() {
  applyConfiguration();
});