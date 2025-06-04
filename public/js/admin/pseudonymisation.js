// pseudonymisation.js
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('pseudonymisation-module');
  if (!container) return;


// Interface d'import
const form = document.createElement('form');
form.innerHTML = `
  <label for="campaign-name">Nom de la campagne :</label>
  <input type="text" id="campaign-name" placeholder="Ex: Formation du 15 mars" style="width: 100%; margin-bottom: 10px;" required />

  <label for="scan-mode">Type de scan :</label>
  <select id="scan-mode" style="margin-left: 10px; margin-bottom: 10px;">
    <option value="passage">Passage</option>
    <option value="presence">Présence</option>
  </select><br/>

  <div id="presence-options" style="display: none; margin-bottom: 10px;">
    <label for="start-time">Début :</label>
    <input type="datetime-local" id="start-time" />
    <label for="end-time" style="margin-left: 10px;">Fin :</label>
    <input type="datetime-local" id="end-time" />
  </div>

  <input type="file" id="csvFileInput" accept=".csv, .xlsx" required />
  <button type="submit">📄 Importer la liste</button>
`;





  form.onsubmit = async (e) => {
    e.preventDefault();
    const file = document.getElementById('csvFileInput').files[0];
    if (!file) return;
const ext = file.name.split('.').pop().toLowerCase();

    const reader = new FileReader();
    reader.onload = async function (event) {
  let data = [];
  const ext = file.name.split('.').pop().toLowerCase();

  try {
    if (ext === 'csv') {
      const text = event.target.result;
      if (!text) throw new Error("Le fichier CSV est vide");
      data = parseCSV(text);
    } else if (ext === 'xlsx') {
      const workbook = XLSX.read(event.target.result, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      if (!worksheet) throw new Error("Feuille Excel non lisible");
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      throw new Error('Format non supporté');
    }

    if (!data || data.length === 0) {
      throw new Error("Aucune donnée détectée dans le fichier");
    }

    generatePseudonyms(data);
  } catch (err) {
    document.getElementById('import-status').textContent = '❌ Erreur : ' + err.message;


    console.error(err);
  }
};

   if (ext === 'csv') {
      reader.readAsText(file);
    } else if (ext === 'xlsx') {
      reader.readAsBinaryString(file); 
    }
  };

  // Initialiser la clé de chiffrement avant d'afficher le formulaire
  initEncryptionKey().then(() => {
    container.appendChild(form);
	
	document.getElementById('scan-mode').addEventListener('change', () => {
  const mode = document.getElementById('scan-mode').value;
  const options = document.getElementById('presence-options');
  options.style.display = (mode === 'presence') ? 'block' : 'none';
});
  });
});

let encryptionKey;

async function initEncryptionKey() {
  const storedKey = localStorage.getItem('pseudonymisation_key');
  if (storedKey) {
    const rawKey = Uint8Array.from(atob(storedKey), c => c.charCodeAt(0));
    encryptionKey = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);
  } else {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const rawKey = await crypto.subtle.exportKey('raw', key);
    const encoded = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
    localStorage.setItem('pseudonymisation_key', encoded);
    encryptionKey = key;
  }
}


function parseCSV(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim();
    });
    return obj;
  });
}

async function generatePseudonyms(data) {
  const results = [];
  const prefix = 'A';
  data.forEach((entry, index) => {
    const pseudonym = `${prefix}${(index + 1).toString().padStart(3, '0')}`;
    entry.id = pseudonym;
    results.push(entry);
  });

  localStorage.setItem('pseudonymisation_data', JSON.stringify(results));
  await encryptMapping(results);
  await createPseudonymCampaign(results);
}






async function encryptMapping(data) {
  const encoder = new TextEncoder();
  const mapping = data.map(p => ({
    id: p.id,
    nom: p.Nom || p.nom || '',
    prenom: p.Prénom || p.prenom || '',
    groupe: p.Groupe || p.groupe || ''
  }));

  const plaintext = encoder.encode(JSON.stringify(mapping));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  try {
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      encryptionKey,
      plaintext
    );

    const full = {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(ciphertext))
    };

    localStorage.setItem('pseudonymisation_encrypted', JSON.stringify(full));
    console.log("✅ Données pseudonymes ↔ noms chiffrées avec succès.");
  } catch (err) {
    console.error("❌ Échec du chiffrement :", err);
  }
}


async function revealDecryptedMapping() {
  if (!encryptionKey) await initEncryptionKey();

  const encrypted = localStorage.getItem('pseudonymisation_encrypted');
  if (!encrypted) {
    alert("Aucune donnée chiffrée trouvée.");
    return;
  }

  const { iv, data } = JSON.parse(encrypted);
  const ivBytes = new Uint8Array(iv);
  const ciphertext = new Uint8Array(data);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      encryptionKey,
      ciphertext
    );
    const decoded = new TextDecoder().decode(decrypted);
    const mapping = JSON.parse(decoded);

   

    // ✅ Ajout ici : affichage des QR codes stockés dans la campagne
    const campaign = JSON.parse(localStorage.getItem('pseudonymisation_campaign'));
   if (campaign?.qrs?.length) {
  // Injecter les identités dans la popup de campagne
  const allCampaigns = document.querySelectorAll('.campaign-popup-content');
  for (const popup of allCampaigns) {
    const h2 = popup.querySelector('h2');
    if (h2 && h2.textContent.includes(campaign.type)) {
      popup.dataset.identities = JSON.stringify(mapping); // pour la réutilisation
      toggleIdentitiesForCampaign(h2.textContent); // affiche automatiquement
    }
  }
}


  } catch (err) {
    console.error("❌ Échec du déchiffrement :", err);
    alert("Erreur lors du déchiffrement. Clé invalide ou données corrompues.");
  }
}

function exportEncryptedMapping() {
  const encryptedData = localStorage.getItem('pseudonymisation_encrypted');
  const encryptionKey = localStorage.getItem('pseudonymisation_key');

  if (!encryptedData || !encryptionKey) {
    alert("❌ Aucune donnée à exporter.");
    return;
  }

  const exportData = {
    type: "pseudonymisation_backup",
    version: "1.0",
    date: new Date().toISOString(),
    key: encryptionKey,
    data: JSON.parse(encryptedData)
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_pseudonymisation_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function importEncryptedMapping(file) {
  const reader = new FileReader();
  reader.onload = async function (event) {
    try {
      const content = JSON.parse(event.target.result);

      if (content.type !== "pseudonymisation_backup" || !content.key || !content.data) {
        throw new Error("Fichier de sauvegarde invalide.");
      }

      localStorage.setItem('pseudonymisation_key', content.key);
      localStorage.setItem('pseudonymisation_encrypted', JSON.stringify(content.data));

      encryptionKey = await crypto.subtle.importKey(
        'raw',
        Uint8Array.from(atob(content.key), c => c.charCodeAt(0)),
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
      );

      alert("✅ Données restaurées !");
    } catch (err) {
      console.error(err);
      alert("❌ Erreur à l'import : " + err.message);
    }
  };
  reader.readAsText(file);
}


async function createPseudonymCampaign(data) {
  const now = new Date();
  const datetime = now.toISOString().slice(0,16).replace(/[-T:]/g, '');
  const scanType = `pseudonymes_${datetime}`;

  // Récupérer le nom de campagne saisi par l'utilisateur
  const campaignName = document.getElementById('campaign-name').value || `Import CSV ${now.toLocaleString()}`;

  // 🔘 Récupérer le mode choisi (passage ou présence)
  const selectedMode = document.getElementById('scan-mode').value;

  console.log("🔁 Génération des QR codes pour pseudonymes...", data);

  const qrs = data.map(p => {
    const qr = {
      location: p.id,
      location_id: p.id,
      scan_type: scanType,
      url: `/scanner?location_id=${encodeURIComponent(p.id)}&scan_type=${scanType}`,
      created_at: now.toISOString(),
      enabled: true
    };

    if (selectedMode === 'passage') {
      qr.mode = 'passage';
      qr.max_scans_per_uuid = 1;
    } else if (selectedMode === 'presence') {
      qr.mode = 'presence';

      const startInput = document.getElementById('start-time').value;
      const endInput = document.getElementById('end-time').value;

      const startDate = new Date(startInput);
      const endDate = new Date(endInput);

      qr.presence = {
        nombre_personnes: 1,
        date_debut: startDate.toISOString().slice(0, 10),
        heure_debut: startDate.toISOString().slice(11, 16),
        date_fin: endDate.toISOString().slice(0, 10),
        heure_fin: endDate.toISOString().slice(11, 16)
      };
    }

    return qr;
  });

  console.log("📦 QRs générés :", qrs);

  const campaign = {
    name: campaignName, // Utiliser le nom personnalisé
    description: "Campagne générée automatiquement depuis pseudonymisation.",
    type: scanType,
    created_at: now.toISOString(),
    editable: true,
    sector: 'Pseudonymisation',
    enabled: true,
    qrs: qrs
  };
  
  localStorage.setItem('pseudonymisation_campaign', JSON.stringify(campaign)); 
  console.log("📤 Envoi de la campagne : ", campaign);

  try {
    const res = await fetch('/campaignsave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaign)
    });

    const text = await res.text();
    if (res.ok) {
      console.log("✅ Campagne pseudonymisation enregistrée :", text);
      
      // Afficher le popup de confirmation
      showCenterMessage(`Votre liste "${campaignName}" a bien été importée`, 3000);
      
      // Attendre un peu avant de fermer la modale
      setTimeout(() => {
        // Fermer la modale
        const popup = document.getElementById('create-campaign-popup');
        if (popup) {
          popup.style.display = 'none';
          
          // Réinitialiser à la vue principale
          if (document.getElementById('create-view')) {
            document.getElementById('create-view').style.display = 'block';
          }
          if (document.getElementById('import-view')) {
            document.getElementById('import-view').style.display = 'none';
          }
        }
        
        // Recharger les campagnes
        loadCampaigns();
        setTimeout(() => {
          openLastPseudonymCampaign();
        }, 500);
      }, 2000); // Attendre 2 secondes après l'affichage du message

      // Mémoriser temporairement le nom de la dernière campagne
      localStorage.setItem('last_pseudonym_type', scanType);
    } else {
      throw new Error("❌ Erreur serveur : " + text);
    }
  } catch (err) {
    console.error("❌ Impossible de sauvegarder la campagne pseudonymisation :", err);
  }
}



function openLastPseudonymCampaign() {
  const scanType = localStorage.getItem('last_pseudonym_type');
  if (!scanType) return;

  const allCards = document.querySelectorAll('.campaign-item');
  for (const card of allCards) {
    const text = card.textContent || '';
    if (text.includes(scanType)) {
      card.click(); // Simule un clic pour ouvrir la popup
      break;
    }
  }
}

