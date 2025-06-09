// Récupérer les paramètres de l'URL
const urlParams = new URLSearchParams(window.location.search);
const locationId = urlParams.get('location_id');
const scanType = urlParams.get('scan_type');

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
  initScanner();
  
  // Activer le mode debug si ?debug=true dans l'URL
  if (urlParams.get('debug') === 'true') {
    document.getElementById('debug-container').classList.add('visible');
  }
});


// Initialiser le scanner
function initScanner() {
  // Vérifier si les paramètres sont présents
  if (!locationId || !scanType) {
    showError('QR code invalide. Paramètres manquants.');
    document.getElementById('scan-button').disabled = true;
  } else {
    // Afficher le nom du lieu
    document.getElementById('location-name').textContent = locationId;
    
    // Déclencher le scan automatiquement après 500ms
    setTimeout(() => {
      scanLocation();
    }, 500);
  }

  // Ajouter l'écouteur d'événements au bouton
  document.getElementById('scan-button').addEventListener('click', scanLocation);
  
  // Mettre à jour les informations de débogage
  updateDebugInfo();
}
// Fonction de scan
// Fonction de scan améliorée
async function scanLocation() {
  // Récupérer ou générer l'UUID de l'appareil
  let deviceUuid = localStorage.getItem('deviceUuid');
  if (!deviceUuid) {
    deviceUuid = generateUUID();
    localStorage.setItem('deviceUuid', deviceUuid);
  }

  // UI updates
  document.getElementById('scan-button').style.display = 'none';
  document.getElementById('loading').style.display = 'block';
  document.getElementById('result').innerHTML = '';

  try {
    const apiUrl = `${getServerUrl()}/scan?uuid=${deviceUuid}&location_id=${locationId}&scan_type=${scanType}`;
    logDebug("Appel API:", apiUrl);
    
    const response = await fetch(apiUrl);
    document.getElementById('loading').style.display = 'none';
    
    const responseText = await response.text();
    logDebug("Réponse:", responseText);
    
    if (!response.ok) {
      if (response.status === 409) {
        showWarning(responseText);
        // Réafficher le bouton après 3 secondes
        setTimeout(() => {
          document.getElementById('scan-button').style.display = 'block';
        }, 3000);
        return;
      }
      if (response.status === 403) {
        showError(responseText);
        return;
      }
      throw new Error(`Erreur serveur: ${response.status} ${response.statusText}`);
    }
    
    // Afficher le succès avec une animation
    showSuccessWithAnimation(responseText);
    
  } catch (error) {
    document.getElementById('loading').style.display = 'none';
    logDebug("Erreur complète:", error);
    showError('Erreur: ' + error.message);
    
    // Réafficher le bouton en cas d'erreur
    setTimeout(() => {
      document.getElementById('scan-button').style.display = 'block';
    }, 3000);
  }
}


// Afficher le succès avec animation
function showSuccessWithAnimation(message) {
  const resultElement = document.getElementById('result');
  resultElement.className = 'message success';
  resultElement.innerHTML = `
    <div class="scan-success-icon">✅</div>
    <div>${message}</div>
  `;
  
  // Vibration si supportée
  if (navigator.vibrate) {
    navigator.vibrate(200);
  }
}


// Fonction pour générer un UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Fonction pour récupérer l'URL du serveur
function getServerUrl() {
  return window.location.origin;
}

// Fonctions d'interface utilisateur
function showSuccess(message) {
  const resultElement = document.getElementById('result');
  resultElement.className = 'message success';
  resultElement.textContent = message;
}

function showError(message) {
  const resultElement = document.getElementById('result');
  resultElement.className = 'message error';
  resultElement.textContent = message;
}

function showWarning(message) {
  const resultElement = document.getElementById('result');
  resultElement.className = 'message warning';
  resultElement.textContent = message;
}

// Fonctions de débogage
function updateDebugInfo() {
  const debugUuid = localStorage.getItem('deviceUuid') || 'Non généré';
  document.getElementById('debug-uuid').textContent = debugUuid;
  document.getElementById('debug-params').textContent = window.location.search;
}

function logDebug(...args) {
  console.log(...args);
  const debugConsole = document.getElementById('debug-console');
  if (debugConsole) {
    debugConsole.innerHTML += args.join(' ') + '\n';
  }
}