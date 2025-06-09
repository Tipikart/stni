// Gestionnaire des campagnes et QR codes
const DEBUG = false;
const SERVER_URL = "http://192.168.42.88:3000";
let campaigns = [];

let campaignsPerPage = 10;  // Nombre de campagnes par page
let currentPage = 1; 


// Ajouter cette fonction dans /js/admin/campaigns.js
// Vous pouvez la mettre après la ligne "let campaigns = [];"
function loadCampaigns() {
  console.log("Chargement des campagnes depuis le serveur...");
  
  fetch(`${SERVER_URL}/campaigns`)
    .then(res => res.json())
    .then(data => {
      console.log("Campagnes reçues:", data);
      campaigns = data;
      // Stocker globalement
      window.campaigns = campaigns;
      renderCampaigns();
    })
    .catch(error => {
      console.error("Erreur lors du chargement des campagnes:", error);
      showError("Impossible de charger les campagnes.");
    });
}


// Chargement des campagnes depuis le serveur
// Chargement des campagnes depuis le serveur
function renderCampaigns() {
  console.log("Rendu des campagnes:", campaigns.length);
  const listContainer = document.getElementById("campaigns-list");
  listContainer.innerHTML = "";
  listContainer.className = "campaigns-grid";

  // Filtrer les campagnes selon la configuration active
  let filteredCampaigns = campaigns;
  
  // Trier les campagnes par date de création décroissante (plus récentes en premier)
  filteredCampaigns.sort((a, b) => {
    // Si created_at n'existe pas, utiliser une date très ancienne par défaut
    const dateA = new Date(a.created_at || '1900-01-01');
    const dateB = new Date(b.created_at || '1900-01-01');
    return dateB - dateA; // Ordre décroissant (plus récente en premier)
  });

  fetch(`${SERVER_URL}/stats`)
    .then(res => res.json())
    .then(statsData => {
      const totalPages = Math.ceil(filteredCampaigns.length / campaignsPerPage);
      const startIndex = (currentPage - 1) * campaignsPerPage;
      const endIndex = startIndex + campaignsPerPage;
      const campaignsToShow = filteredCampaigns.slice(startIndex, endIndex);

      // Vérifier si la barre d'outils existe déjà et la supprimer
      const existingToolbar = document.querySelector('.campaigns-toolbar');
      if (existingToolbar) {
        existingToolbar.remove();
      }

      // Créer la barre d'outils une seule fois si il y a des campagnes
      if (campaignsToShow.length > 0) {
        const toolbarElement = document.createElement("div");
        toolbarElement.className = "campaigns-toolbar";
        toolbarElement.innerHTML = `
          <div class="toolbar-left">
            <label class="select-all-label">
              <input type="checkbox" id="select-all-campaigns" onchange="toggleSelectAll()">
              <span>Tout sélectionner</span>
            </label>
          </div>
          <div class="toolbar-right">
            <button id="delete-selected-btn" class="btn btn-danger" onclick="deleteSelectedCampaigns()" disabled>
              Supprimer
            </button>
          </div>
        `;
        
        // Insérer la barre d'outils avant la grille
        listContainer.parentNode.insertBefore(toolbarElement, listContainer);
      }

      // Ajouter les campagnes
      campaignsToShow.forEach((campaign, index) => {
        console.log(`Rendu de la campagne ${index}:`, campaign.name);

        const campaignStats = statsData[campaign.type]?.total || 0;
        const qrCount = campaign.qrs?.length || 0;

        const campaignItem = document.createElement("div");
        campaignItem.className = "campaign-item-wrapper";
        campaignItem.innerHTML = `
          <div class="campaign-item">
            <div>
              <div class="campaign-item-name">${campaign.name}</div>
              <div class="campaign-item-info">${qrCount} QR codes</div>
            </div>
            <div class="campaign-item-stats">${campaignStats} scans</div>
          </div>
          <label class="campaign-checkbox-label">
            <input type="checkbox" class="campaign-checkbox" data-campaign-type="${campaign.type}" data-campaign-index="${index}">
            <span>Sélectionner</span>
          </label>
        `;

        // Modifier l'événement click pour cibler seulement la partie haute
        const campaignClickArea = campaignItem.querySelector('.campaign-item');
        campaignClickArea.addEventListener("click", () => openCampaignPopup(campaign, index, statsData));
        
        listContainer.appendChild(campaignItem);
      });

      // Pagination simplifiée
      if (totalPages > 1) {
        const paginationDiv = document.createElement("div");
        paginationDiv.className = "pagination";

        if (currentPage > 1) {
          const prevBtn = document.createElement("button");
          prevBtn.className = "btn";
          prevBtn.textContent = "← Précédent";
          prevBtn.onclick = () => {
            currentPage--;
            renderCampaigns();
          };
          paginationDiv.appendChild(prevBtn);
        }

        const pageIndicator = document.createElement("span");
        pageIndicator.className = "page-indicator";
        pageIndicator.textContent = `Page ${currentPage} / ${totalPages}`;
        paginationDiv.appendChild(pageIndicator);

        if (currentPage < totalPages) {
          const nextBtn = document.createElement("button");
          nextBtn.className = "btn";
          nextBtn.textContent = "Suivant →";
          nextBtn.onclick = () => {
            currentPage++;
            renderCampaigns();
          };
          paginationDiv.appendChild(nextBtn);
        }

        listContainer.appendChild(paginationDiv);
      }
      
      // Ajouter des event listeners aux checkboxes
      document.querySelectorAll('.campaign-checkbox').forEach(cb => {
        cb.addEventListener('change', updateDeleteButton);
      });
      
      debugCampaigns();
    })
    .catch(err => {
      console.error("Erreur chargement stats:", err);
      showError("Impossible de charger les statistiques.");
    });
}

// Fonction pour ouvrir la première campagne disponible
function openFirstCampaign() {
  if (campaigns.length === 0) {
    showError("Aucune campagne disponible à gérer");
    return;
  }
  
  // Charger les statistiques et ouvrir la première campagne
  fetch(`${SERVER_URL}/stats`)
    .then(res => res.json())
    .then(statsData => {
      // Ouvrir la popup de la première campagne
      openCampaignPopup(campaigns[0], 0, statsData);
    })
    .catch(err => {
      console.error("Erreur lors du chargement des statistiques:", err);
      showError("Impossible de charger les statistiques");
    });
}

// Exporter la fonction pour la rendre globale
window.openFirstCampaign = openFirstCampaign;


// Gérer la sélection multiple de campagnes
function getSelectedCampaigns() {
  const checkboxes = document.querySelectorAll('.campaign-checkbox:checked');
  return Array.from(checkboxes).map(cb => ({
    type: cb.dataset.campaignType,
    index: parseInt(cb.dataset.campaignIndex)
  }));
}

// Supprimer les campagnes sélectionnées
function deleteSelectedCampaigns() {
  const selected = getSelectedCampaigns();
  
  if (selected.length === 0) {
    showError("Aucune campagne sélectionnée");
    return;
  }
  
  const campaignNames = selected.map(s => campaigns[s.index].name).join(', ');
  
  showConfirmDialog(
    `Supprimer ${selected.length} campagne(s) : ${campaignNames} ?`,
    () => {
      showStatus("Suppression en cours...");
      
      // Trier par index décroissant pour éviter les problèmes lors de la suppression
      selected.sort((a, b) => b.index - a.index);
      
      // Supprimer chaque campagne
      let deleted = 0;
      
      selected.forEach(({ type, index }) => {
        fetch(`${SERVER_URL}/campaigndelete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: type })
        })
        .then(res => {
          if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
          return res.text();
        })
        .then(() => {
          deleted++;
          if (deleted === selected.length) {
            // Toutes les suppressions sont terminées
            showCenterMessage(`${deleted} campagne(s) supprimée(s)`);
            loadCampaigns(); // Recharger la liste
          }
        })
        .catch(error => {
          console.error("Erreur lors de la suppression:", error);
          showError("Erreur lors de la suppression: " + error.message);
        });
      });
    }
  );
}

// Sélectionner/désélectionner toutes les campagnes
function toggleSelectAll() {
  const allCheckboxes = document.querySelectorAll('.campaign-checkbox');
  const selectAllCheckbox = document.getElementById('select-all-campaigns');
  
  allCheckboxes.forEach(cb => {
    cb.checked = selectAllCheckbox.checked;
  });
  
  updateDeleteButton();
}

// Mettre à jour l'état du bouton supprimer
function updateDeleteButton() {
  const selected = getSelectedCampaigns();
  const deleteBtn = document.getElementById('delete-selected-btn');
  
  if (deleteBtn) {
    deleteBtn.disabled = selected.length === 0;
    deleteBtn.textContent = selected.length > 0 
      ? `Supprimer (${selected.length})` 
      : 'Supprimer';
  }
}



// Ajouter un QR code à une campagne
function addQR(e, index) {
  e.preventDefault();
  const form = e.target;
  const location = form.location_id.value.trim();
  if (!location) return false;

  console.log(`Ajout d'un QR code à la campagne ${index}:`, location);
  
  const campaign = campaigns[index];
  
  // Assurez-vous d'utiliser une URL complète
  const baseUrl = 'http://192.168.42.88:3000'; // Votre IP locale
  const url = `${baseUrl}/scanner?location_id=${encodeURIComponent(location)}&scan_type=${encodeURIComponent(campaign.type)}`;
  
  console.log("URL complète générée:", url);
  
  const mode = form.qr_mode?.value || 'passage';

  const qr = {
    location,
    location_id: location,
    url: url, // URL complète ici
    scan_type: campaign.type,
    created_at: new Date().toISOString(),
    mode
  };
// Mode "passage"
if (mode === 'passage') {
  qr.max_scans_per_uuid = parseInt(form.max_scans_per_uuid?.value || '1', 10);
  qr.enabled = true; // S'assurer que enabled est défini
}
// Mode "présence"
if (mode === 'presence') {
  qr.presence = {
    nombre_personnes: parseInt(form.nombre_personnes?.value || '1', 10),
    date_debut: form.date_debut?.value || '',
    heure_debut: form.heure_debut?.value || '',
    date_fin: form.date_fin?.value || '',
    heure_fin: form.heure_fin?.value || ''
  };
}


  
  // Ajouter le QR à la campagne locale
  campaign.qrs.push(qr);
  console.log(`QR ajouté, nombre total de QR dans la campagne:`, campaign.qrs.length);
  
  // Envoyer au serveur
  fetch(`${SERVER_URL}/qrsave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(qr)
  })
  .then(res => res.text())
  .then(response => {
    console.log("Réponse du serveur (qrsave):", response);
    showStatus("QR code créé et enregistré");
	showCenterMessage(`Le QR code « ${location} » a été généré`);

    
    // Fermer le popup actuel
  // Recharger uniquement la popup de cette campagne
fetch(`${SERVER_URL}/stats`)
  .then(res => res.json())
  .then(statsData => {
    const updatedCampaign = campaigns[index];
    openCampaignPopup(updatedCampaign, index, statsData);
    showStatus("QR code ajouté avec succès");
  });

  })
  .catch(error => {
    console.error("Erreur lors de l'enregistrement du QR:", error);
    showError("Erreur lors de l'enregistrement du QR: " + error.message);
  });
  
  return false;
}

// Supprimer un QR code
function toggleQRStatus(campaignType, locationId, current) {
  fetch(`${SERVER_URL}/qrtoggle`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      campaign_type: campaignType,
      location_id: locationId,
      enabled: !current
    })
  })
  .then(res => {
    if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
    return res.text();
  })
  .then(response => {
    console.log("QR code mis à jour sur le serveur:", response);

    // ✅ Mettre à jour l’état local du QR
    const campaign = campaigns.find(c => c.type === campaignType);
    if (campaign) {
      const qr = campaign.qrs.find(q => (q.location_id || q.location) === locationId);
      if (qr) {
        qr.enabled = !current;
		
      }
    }

    // 🔄 Recharger uniquement le popup de la campagne concernée
    const index = campaigns.findIndex(c => c.type === campaignType);
    if (index === -1) throw new Error("Campagne non trouvée localement");

    fetch(`${SERVER_URL}/stats`)
      .then(res => res.json())
      .then(statsData => openCampaignPopup(campaigns[index], index, statsData));

    showStatus(`QR code ${!current ? 'activé' : 'désactivé'} avec succès`);
  })
  .catch(err => showError("Erreur de mise à jour QR: " + err.message));
}
function deleteQR(campaignIndex, qrIndex) {
  const campaign = campaigns[campaignIndex];
  const qr = campaign.qrs[qrIndex];

  showConfirmDialog(`Supprimer le QR code « ${qr.location} » ?`, () => {
    showStatus("Suppression en cours...");

    fetch(`${SERVER_URL}/qrdelete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_type: campaign.type,
        location_id: qr.location_id || qr.location
      })
    })
    .then(res => {
      if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
      return res.text();
    })
    .then(response => {
      console.log("QR supprimé sur le serveur:", response);

      // Supprimer localement
      campaign.qrs.splice(qrIndex, 1);

      // 🔁 Vérifie si la liste QR était affichée avant la mise à jour
      const wasOpen = !document.querySelector('.qr-list')?.classList.contains('hidden');

      // Recharger uniquement le popup de cette campagne
      fetch(`${SERVER_URL}/stats`)
        .then(res => res.json())
        .then(statsData => {
          openCampaignPopup(campaign, campaignIndex, statsData, true);


          // Si elle était affichée, on la réaffiche de force
          if (wasOpen) {
            setTimeout(() => {
              const toggleBtn = document.querySelector('.toggle-qr-list');
              const qrList = document.querySelector('.qr-list');
              if (toggleBtn && qrList && qrList.classList.contains('hidden')) {
                qrList.classList.remove('hidden');
                toggleBtn.textContent = "🔽 Masquer les QR codes";
              }
            }, 200);
          }
        });

      showStatus("QR code supprimé avec succès");
    })
    .catch(error => {
      console.error("Erreur lors de la suppression:", error);
      showError("Erreur lors de la suppression: " + error.message);
    });
  });
}




// Supprimer une campagne
function deleteCampaign(index) {
  const campaign = campaigns[index];

  showConfirmDialog(`Supprimer la campagne « ${campaign.name || campaign.type} » et tous ses QR codes ?`, () => {
    showStatus("Suppression en cours...");

    fetch(`${SERVER_URL}/campaigndelete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: campaign.type })
    })
    .then(res => {
      if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
      return res.text();
    })
    .then(response => {
      console.log("Campagne supprimée sur le serveur:", response);

      // Supprimer localement
      campaigns.splice(index, 1);

      // Fermer le popup
      document.getElementById("campaign-popup-container").innerHTML = "";

      // Recharger la liste
      loadCampaigns();

      // ✅ Message central
      showCenterMessage(`La campagne « ${campaign.name || campaign.type} » a été supprimée`);

      showStatus("Campagne supprimée avec succès");
    })
    .catch(error => {
      console.error("Erreur lors de la suppression:", error);
      showError("Erreur lors de la suppression: " + error.message);
    });
  });
}





// Activer/désactiver une campagne
// Activer/désactiver une campagne
function toggleCampaignStatus(idx) {
  const camp = campaigns[idx];
  const newStatus = !camp.enabled;

  fetch(`${SERVER_URL}/campaigntoggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: camp.type, enabled: newStatus })
  })
  .then(res => {
    if (!res.ok) throw new Error("Erreur serveur");
    return res.text();
  })
  .then(() => {
    // ✅ Mise à jour locale
    camp.enabled = newStatus;

    // ✅ Mise à jour immédiate du toggle switch
    const toggleElement = document.getElementById(`toggle-campaign-${camp.type}`);
    if (toggleElement) {
      if (newStatus) {
        toggleElement.classList.add('active');
      } else {
        toggleElement.classList.remove('active');
      }
    }

    // ✅ Mise à jour du statut dans la sidebar
    const quickStatElements = document.querySelectorAll('.quick-stat-value');
    if (quickStatElements.length >= 3) {
      quickStatElements[2].textContent = newStatus ? 'Actif' : 'Inactif';
    }

    // ✅ Message central
    showCenterMessage(`La campagne « ${camp.name || camp.type} » est maintenant ${newStatus ? 'active' : 'désactivée'}`);
    showStatus(`Campagne ${newStatus ? 'activée' : 'désactivée'} avec succès`);
  })
  .catch(err => {
    console.error("Erreur mise à jour campagne:", err);
    showError("Erreur de mise à jour campagne: " + err.message);
  });
}

// Fonction pour gérer les toggle switches
function handleToggleSwitch(element, callback) {
  element.addEventListener('click', function() {
    const isActive = this.classList.contains('active');
    const newState = !isActive;
    
    // Mettre à jour visuellement
    if (newState) {
      this.classList.add('active');
    } else {
      this.classList.remove('active');
    }
    
    // Appeler le callback avec le nouvel état
    if (callback) {
      callback(newState);
    }
  });
}

// Exporter les données d'une campagne au format JSON
function exportCampaignJSON(type) {
  fetch(`${SERVER_URL}/stats`)
    .then(res => res.json())
    .then(stats => {
      const data = stats[type] || {};
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${type}.json`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(err => showError("Erreur export JSON campagne : " + err.message));
}

// Exporter les données d'un QR code au format JSON
function exportQRJSON(type, location) {
  fetch(`${SERVER_URL}/stats`)
    .then(res => res.json())
    .then(stats => {
      const qrStats = (stats[type] && stats[type].qrs && stats[type].qrs[location]) || 0;
      const payload = { campaign: type, location, scans: qrStats };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${type}-${location}.json`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(err => showError("Erreur export JSON QR : " + err.message));
}

document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("open-create-popup");
  const popup = document.getElementById("create-campaign-popup");
  const form = document.getElementById("create-campaign-form");

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      if (popup) {
        popup.style.display = "flex";
      }
      // S'assurer que la vue principale est affichée
      const createView = document.getElementById('create-view');
      const importView = document.getElementById('import-view');
      
      if (createView) {
        createView.style.display = 'block';
      }
      if (importView) {
        importView.style.display = 'none';
      }
    });
  }

  // Définir la fonction globale pour fermer le popup  
  window.closeCreatePopup = () => {
    if (popup) {
      popup.style.display = "none";
    }
    // Réinitialiser à la vue principale pour la prochaine ouverture
    const createView = document.getElementById('create-view');
    const importView = document.getElementById('import-view');
    
    if (createView) {
      createView.style.display = 'block';
    }
    if (importView) {
      importView.style.display = 'none';
    }
  };

  if (form) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      const name = form.name.value.trim();
      const nameSlug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
      const scan_type = `auto_${nameSlug}_${new Date().toISOString().slice(0,10).replace(/-/g, '')}`;
      
      // Mettre à jour le champ caché
      const scanTypeInput = form.scan_type;
      if (scanTypeInput) {
        scanTypeInput.value = scan_type;
      }

      const description = form.description.value.trim();

      if (!name || !scan_type) {
        showError("Nom et identifiant sont requis");
        return;
      }

      console.log("Création d'une nouvelle campagne:", name);
      showStatus("Création en cours...");

      const newCampaign = {
        name,
        type: scan_type,
        description,
        created_at: new Date().toISOString().slice(0, 10),
        qrs: [],
        enabled: true
      };

      fetch(`${SERVER_URL}/campaignsave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCampaign)
      })
      .then(res => res.text())
      .then(response => {
        console.log("Réponse serveur:", response);

        if (response.includes("déjà existante")) {
          showError("Cette campagne existe déjà.");
          return;
        }

        campaigns.push(newCampaign);
        renderCampaigns();
        
        if (popup) {
          popup.style.display = "none";
        }
        
        form.reset();

        // Réinitialiser à la vue principale
        const createView = document.getElementById('create-view');
        const importView = document.getElementById('import-view');
        
        if (createView) {
          createView.style.display = 'block';
        }
        if (importView) {
          importView.style.display = 'none';
        }

        showStatus("✅ Campagne créée avec succès !");
        showCenterMessage(`La campagne « ${name} » a été ajoutée`);
      })
      .catch(err => {
        console.error("Erreur création de campagne", err);
        showError("Erreur lors de la création de la campagne: " + err.message);
      });
    });
  }
});

// Ajouter ces fonctions globales pour gérer les changements de vues
window.switchToImportView = function() {
  const createView = document.getElementById('create-view');
  const importView = document.getElementById('import-view');
  
  if (createView) createView.style.display = 'none';
  if (importView) importView.style.display = 'block';
};

window.switchToCreateView = function() {
  const createView = document.getElementById('create-view');
  const importView = document.getElementById('import-view');
  
  if (createView) createView.style.display = 'block';
  if (importView) importView.style.display = 'none';
};


// Fonction de débogage pour afficher l'état des campagnes
function debugCampaigns() {
  if (!DEBUG) return;
  
  const debugInfo = document.getElementById('debug-info');
  debugInfo.style.display = 'block';
  
  const summary = campaigns.map(c => {
    return {
      name: c.name,
      type: c.type,
      qrs_count: c.qrs ? c.qrs.length : 0,
      qrs: c.qrs ? c.qrs.map(q => q.location) : []
    };
  });
  
  
  debugInfo.innerHTML = `<strong>État des campagnes (${campaigns.length}):</strong><br>
                        <pre>${JSON.stringify(summary, null, 2)}</pre>`;
}



function showConfirmDialog(message, onConfirm) {
  const overlay = document.getElementById("confirm-overlay");
  const msg = document.getElementById("confirm-message");
  const yes = document.getElementById("confirm-yes");
  const no = document.getElementById("confirm-no");

  msg.textContent = message;
  overlay.style.display = "block";

  const close = () => overlay.style.display = "none";

  yes.onclick = () => {
    close();
    onConfirm();
  };
  no.onclick = close;
}
const openCreateBtn = document.getElementById("open-create-popup");
if (openCreateBtn) {
  openCreateBtn.addEventListener("click", () => {
    const createPopup = document.getElementById("create-campaign-popup");
    if (createPopup) {
      createPopup.style.display = "flex";
    }
  });
}


function closeCreatePopup() {
  document.getElementById("create-campaign-popup").style.display = "none";
}



window.deleteQR = deleteQR;
window.toggleQRStatus = toggleQRStatus;
window.getSelectedCampaigns = getSelectedCampaigns;
window.deleteSelectedCampaigns = deleteSelectedCampaigns;
window.toggleSelectAll = toggleSelectAll;
window.updateDeleteButton = updateDeleteButton;
window.openFirstCampaign = openFirstCampaign;
window.loadCampaigns = loadCampaigns;


window.addQR = addQR;
window.deleteCampaign = deleteCampaign;
window.toggleCampaignStatus = toggleCampaignStatus;
window.exportCampaignJSON = exportCampaignJSON;
window.campaigns = campaigns;