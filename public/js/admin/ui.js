let proofFiles = [];

// Fonctions d'interface utilisateur et de manipulation DOM
document.addEventListener('DOMContentLoaded', function() {


  // Charger les campagnes
  console.log("Chargement initial des campagnes...");
  loadCampaigns();

  // Charger les dernières actions
  loadRecentActions();
});

// Afficher les erreurs de manière visible
function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  console.error(message);
}

// Afficher les messages de statut
function showStatus(message) {
  const statusDiv = document.getElementById('status-message');
  statusDiv.textContent = message;
  statusDiv.style.display = 'block';
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 3000);
  console.log(message);
}

// Charger les dernières actions depuis le serveur
function loadRecentActions() {
  const list = document.getElementById('recent-actions-list');
  if (!list) return;

  fetch(`${SERVER_URL}/scanlogs?limit=5`)
    .then(res => res.json())
    .then(actions => {
      list.innerHTML = '';
      actions.forEach(act => {
        const li = document.createElement('li');
        const date = new Date(act.timestamp * 1000).toLocaleString('fr-FR');
        li.textContent = `[${date}] ${act.scan_type} - ${act.location_id} - ${act.uuid}`;
        list.appendChild(li);
      });
    })
    .catch(err => {
      console.error('Erreur chargement actions:', err);
    });
}
// Structure HTML complète corrigée pour openCampaignPopup

function openCampaignPopup(campaign, index, statsData, forceOpenQRList = false) {
  const popupContainer = document.getElementById("campaign-popup-container");
  popupContainer.innerHTML = "";

  // S'assurer que campaigns et statsData sont disponibles globalement
  const globalCampaigns = window.campaigns || campaigns;
  const globalStatsData = window.statsData || statsData;

 // Structure moderne et ergonomique
const modalHTML = `
  <div class="campaign-popup">
    <div class="campaign-popup-content">
      <!-- En-tête simplifié -->
      <div class="popup-header">
        <div class="popup-header-info">
          <h2 class="popup-campaign-name" id="campaign-name-display-${campaign.type}">
            ${campaign.name}
            <button class="edit-btn" onclick="showCampaignNameEdit('${campaign.type}')" title="Modifier">✏️</button>
          </h2>
          <div id="campaign-name-edit-${campaign.type}" style="display:none;">
            <input type="text" class="editable-campaign-name" id="input-name-${campaign.type}" value="${campaign.name}" />
            <button class="save-btn" onclick="updateCampaignName('${campaign.type}')">💾</button>
          </div>
          <span class="popup-date">Créée le ${campaign.created_at}</span>
        </div>
        <button class="close-popup" onclick="closeCampaignPopup()">×</button>
      </div>

      <!-- Body en deux colonnes -->
      <div class="modal-body">
        <!-- Sidebar avec navigation -->
        <div class="modal-sidebar">
          <nav class="tab-nav">
            <button class="tab-nav-item active" onclick="switchTab(this, 'overview')">
              <span class="tab-nav-icon">📊</span>
              Vue d'ensemble
            </button>
            <button class="tab-nav-item" onclick="switchTab(this, 'qr-codes')">
              <span class="tab-nav-icon">🏷️</span>
              QR Codes
            </button>
            <button class="tab-nav-item" onclick="switchTab(this, 'settings')">
              <span class="tab-nav-icon">⚙️</span>
              Paramètres
            </button>
            <button class="tab-nav-item" onclick="switchTab(this, 'proof')">
              <span class="tab-nav-icon">📁</span>
              Preuves
            </button>
          </nav>

          <!-- Quick stats -->
          <div class="campaign-quick-info">
            <div class="quick-stat">
              <span class="quick-stat-label">Scans totaux</span>
              <span class="quick-stat-value">${globalStatsData[campaign.type]?.total || 0}</span>
            </div>
            <div class="quick-stat">
              <span class="quick-stat-label">QR codes</span>
              <span class="quick-stat-value">${campaign.qrs?.length || 0}</span>
            </div>
            <div class="quick-stat">
              <span class="quick-stat-label">État</span>
              <span class="quick-stat-value">${campaign.enabled ? 'Actif' : 'Inactif'}</span>
            </div>
          </div>
          
          <!-- Liste des campagnes -->
          <div class="campaigns-list-section">
            <h4 class="section-title" style="margin: 20px 0 10px 0; padding: 0 20px; color: #666; font-size: 14px; text-transform: uppercase;">Toutes mes campagnes</h4>
            <div class="campaigns-scroll-list" style="max-height: 250px; overflow-y: auto; padding: 0 10px;">
              ${globalCampaigns.map((camp, idx) => {
                const isActive = camp.type === campaign.type;
                const campStats = globalStatsData[camp.type]?.total || 0;
                return `
                  <div class="campaign-nav-item ${isActive ? 'active' : ''}" 
                       style="display: flex; align-items: center; padding: 12px 15px; margin: 5px 0; border-radius: 8px; cursor: pointer; background: ${isActive ? '#e3f2fd' : '#f5f5f5'}; transition: all 0.2s;"
                       onclick="switchToCampaign(${idx})"
                       onmouseover="this.style.backgroundColor='${isActive ? '#e3f2fd' : '#eeeeee'}'"
                       onmouseout="this.style.backgroundColor='${isActive ? '#e3f2fd' : '#f5f5f5'}'">
                    <div style="flex: 1;">
                      <div style="font-weight: ${isActive ? 'bold' : 'normal'}; color: ${isActive ? '#0066cc' : '#333'}; font-size: 14px;">${camp.name}</div>
                      <div style="font-size: 12px; color: #666; margin-top: 2px;">${camp.qrs?.length || 0} QR • ${campStats} scans</div>
                    </div>
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${camp.enabled ? '#4caf50' : '#f44336'}; margin-left: 10px;"></div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Contenu principal -->
        <div class="modal-content-area" style="height: 100%; overflow-y: auto;">
          <!-- Tab Overview -->
          <div id="tab-overview" class="tab-pane active" style="display: block;">
            <div class="content-header">
              <h3 class="content-title">Vue d'ensemble</h3>
              <p class="content-subtitle">Informations et statistiques de votre campagne</p>
              <button class="btn btn-secondary" onclick="showBlockchainVerification('${campaign.type}')">
                Voir les enregistrements Blockchain 🔗
                  </button>
            </div>
            
            
            <div class="content-body">
              <!-- Informations de la campagne -->
              <div class="content-section" style="margin-bottom: 30px;">
                <div class="section-header">
                  <h4 class="section-title">Informations de la campagne</h4>
                  
                </div>
                
                <div class="section-content" style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <div>
                      <h5 style="color: #666; font-size: 14px; margin-bottom: 5px;">Nom de la campagne</h5>
                      <p style="font-size: 18px; font-weight: bold; color: #333; margin: 0;">${campaign.name}</p>
                    </div>
                    
                    <div>
                      <h5 style="color: #666; font-size: 14px; margin-bottom: 5px;">Date de création</h5>
                      <p style="font-size: 16px; color: #333; margin: 0;">${new Date(campaign.created_at).toLocaleDateString('fr-FR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</p>
                    </div>
                    <div>
                      <h5 style="color: #666; font-size: 14px; margin-bottom: 5px;">Statut</h5>
                      <p style="font-size: 16px; margin: 0;">
                        <span style="display: inline-block; padding: 5px 12px; border-radius: 20px; background: ${campaign.enabled ? '#d4edda' : '#f8d7da'}; color: ${campaign.enabled ? '#155724' : '#721c24'};">
                          ${campaign.enabled ? '✅ Active' : '❌ Désactivée'}
                        </span>
                      </p>
                    </div>
                  </div>
                  ${campaign.description ? `
                    <div style="margin-top: 20px;">
                      <h5 style="color: #666; font-size: 14px; margin-bottom: 5px;">Description</h5>
                      <p style="font-size: 16px; color: #333; margin: 0; line-height: 1.5;">${campaign.description}</p>
                    </div>
                  ` : ''}
                </div>
              </div>

           <!-- Résumé des QR codes -->
<div class="content-section" style="margin-bottom: 30px;">
  <div class="section-header">
    <h4 class="section-title">Résumé des QR codes</h4>
  </div>
  <div class="section-content">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
      <!-- Premier bloc - QR codes créés (cliquable) -->
      <div style="background: #fff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; text-align: center; cursor: pointer; transition: all 0.3s ease; position: relative;"
           onclick="goToQRCodesList()"
           onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'; this.style.borderColor='#0066cc'"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.borderColor='#e0e0e0'">
        <div style="position: absolute; top: 10px; right: 10px; color: #0066cc; font-size: 16px;">➡️</div>
        <div style="font-size: 32px; font-weight: bold; color: #0066cc;">${campaign.qrs?.length || 0}</div>
        <div style="color: #666; font-size: 14px; margin-top: 5px;">QR codes créés</div>
        <div style="color: #999; font-size: 12px; margin-top: 3px;">Cliquez pour gérer</div>
      </div>
      
      <!-- Deuxième bloc - QR codes actifs (non cliquable) -->
      <div style="background: #fff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #28a745;">${(campaign.qrs || []).filter(qr => qr.enabled !== false).length}</div>
        <div style="color: #666; font-size: 14px; margin-top: 5px;">QR codes actifs</div>
      </div>
      
      <!-- Troisième bloc - Scans totaux (non cliquable) -->
      <div style="background: #fff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; text-align: center;">
        <div style="font-size: 32px; font-weight: bold; color: #ffc107;">${globalStatsData[campaign.type]?.total || 0}</div>
        <div style="color: #666; font-size: 14px; margin-top: 5px;">Scans totaux</div>
        <div style="color: #999; font-size: 12px; margin-top: 3px;">
          ${(function() {
            if (!globalStatsData[campaign.type] || !globalStatsData[campaign.type].qrs) {
              return '';
            }
            const qrsData = globalStatsData[campaign.type].qrs;
            const totalQRScans = Object.values(qrsData).reduce(function(sum, count) { 
              return sum + count; 
            }, 0);
            return totalQRScans > 0 ? '(' + totalQRScans + ' scans réels)' : '';
          })()}
        </div>
      </div>
    </div>
  </div>
</div>

              <!-- Statistiques globales -->
              <div class="content-section">
                <div class="section-header">
                  <h4 class="section-title">Statistiques globales</h4>
                </div>
                <div class="section-content">
                  <div id="campaign-stats-chart" style="height: 400px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
                    <canvas id="overview-chart-${campaign.type}"></canvas>
                  </div>
                  
                  <!-- Boutons d'actions -->
                  <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="fetchStatsForCampaign('${campaign.type}')">
                      📊 Voir les statistiques détaillées
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab QR Codes -->
          <div id="tab-qr-codes" class="tab-pane" style="display: none;">
            <div class="content-header">
              <h3 class="content-title">Gestion des QR Codes</h3>
              <p class="content-subtitle">Créez et gérez vos points de contrôle</p>
            </div>
            
            <div class="content-body">

            
              <!-- Formulaire d'ajout -->
              <div class="content-section">
                <div class="section-header">
                  <h4 class="section-title">Ajouter un QR Code</h4>
                </div>
                <div class="section-content">
                  <form class="qr-form" onsubmit="return addQR(event, ${index})">
                    <div class="form-row">
                      <div class="form-group">
                        <label class="form-label">Nom du lieu</label>
                        <input type="text" name="location_id" class="form-input" placeholder="Ex: Salle de réunion A" required />
                      </div>
                      <div class="form-group">
                        <label class="form-label">Type de QR</label>
                        <select name="qr_mode" class="form-select" onchange="toggleQRModeFields(this)">
                          <option value="passage">QR de passage</option>
                          <option value="presence">QR de présence</option>
                        </select>
                      </div>
                    </div>

                    <div class="qr-mode-options">
                      <div class="mode-passage" style="display: block;">
                        <div class="form-group">
                          <label class="form-label">Scans maximum par personne</label>
                          <input type="number" name="max_scans_per_uuid" class="form-input" min="1" value="1" />
                        </div>
                      </div>

                      <div class="mode-presence" style="display: none;">
                        <div class="form-group">
                          <label class="form-label">Nombre de personnes</label>
                          <input type="number" name="nombre_personnes" class="form-input" min="1" value="1" />
                        </div>
                        <div class="form-group">
                          <label class="form-label">Date de début</label>
                          <input type="date" name="date_debut" class="form-input" />
                        </div>
                        <div class="form-group">
                          <label class="form-label">Heure de début</label>
                          <input type="time" name="heure_debut" class="form-input" />
                        </div>
                        <div class="form-group">
                          <label class="form-label">Date de fin</label>
                          <input type="date" name="date_fin" class="form-input" />
                        </div>
                        <div class="form-group">
                          <label class="form-label">Heure de fin</label>
                          <input type="time" name="heure_fin" class="form-input" />
                        </div>
                      </div>
                    </div>

                    <button type="submit" class="submit-btn">
                      ➕ Générer le QR Code
                    </button>
                  </form>
                </div>
              </div>

            <!-- Liste des QR codes existants -->
<div class="content-section" style="margin-top: 30px;" id="existing-qr-codes-section">
  <div class="section-header">
    <h4 class="section-title">QR Codes existants (${campaign.qrs?.length || 0})</h4>
  </div>
                <div class="section-content">
                  ${campaign.qrs && campaign.qrs.length > 0 ? `
                    <div class="qr-list-simple" style="display: flex; flex-direction: column; gap: 20px;">
                      ${campaign.qrs.map((qr, qrIndex) => {
                        const uniqueVisitors = statsData[campaign.type]?.qrs?.[qr.location_id || qr.location] || 0;
                        const totalScans = statsData[campaign.type]?.qrsScans?.[qr.location_id || qr.location] || 0;
                        const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(qr.url);
                        
                        return `
                          <div class="qr-item" style="border: 1px solid #ddd; padding: 20px; border-radius: 8px; display: flex; align-items: center; gap: 20px; background: ${qr.enabled ? '#fff' : '#f5f5f5'};">
                            <div class="qr-image" style="flex-shrink: 0;">
                              <img src="${qrUrl}" alt="QR Code" style="width: 150px; height: 150px; border: 1px solid #eee;">
                            </div>
                            
                            <div class="qr-info" style="flex-grow: 1;">
                     

<h5 style="margin: 0 0 10px 0; font-size: 18px; color: #333; display: flex; align-items: center; gap: 10px;">
  <span class="qr-name-display" id="qr-name-${campaign.type}-${qrIndex}">
    ${qr.location || qr.location_id}
  </span>
  <input 
    type="text" 
    class="qr-name-edit" 
    id="qr-name-edit-${campaign.type}-${qrIndex}"
    value="${qr.location || qr.location_id}"
    style="display: none; font-size: 16px; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;"
    onblur="saveQRName('${campaign.type}', '${qr.location_id || qr.location}', ${qrIndex})"
    onkeypress="if(event.key === 'Enter') this.blur()"
  />
  <button 
    class="edit-qr-name-btn"
    onclick="editQRName('${campaign.type}', ${qrIndex})"
    style="background: none; border: none; cursor: pointer; font-size: 14px; padding: 2px 6px; color: #666;"
    title="Renommer"
  >
    ✏️
  </button>
  <span style="margin-left: auto; padding: 3px 8px; border-radius: 4px; font-size: 12px; background: ${qr.enabled ? '#28a745' : '#dc3545'}; color: white;">
    ${qr.enabled ? 'ACTIF' : 'INACTIF'}
  </span>
</h5>
                              <div style="color: #666; font-size: 14px;">
                                <p style="margin: 5px 0;">📊 ${totalScans || uniqueVisitors} scan${(totalScans || uniqueVisitors) > 1 ? 's' : ''}${uniqueVisitors > 0 && totalScans !== uniqueVisitors ? ' (' + uniqueVisitors + ' visiteur' + (uniqueVisitors > 1 ? 's' : '') + ' unique' + (uniqueVisitors > 1 ? 's' : '') + ')' : ''}</p>
                                <p style="margin: 5px 0;">🔄 ${qr.max_scans_per_uuid || 1} scan${(qr.max_scans_per_uuid || 1) > 1 ? 's' : ''} max par personne</p>
                                <p style="margin: 5px 0;">📅 Créé le ${new Date(qr.created_at).toLocaleDateString('fr-FR')}</p>
                                ${qr.mode === 'presence' && qr.presence ? `
                                  <p style="margin: 5px 0;">👥 Mode présence: ${qr.presence.nombre_personnes} personne${qr.presence.nombre_personnes > 1 ? 's' : ''}</p>
                                  <p style="margin: 5px 0;">⏰ ${qr.presence.date_debut} ${qr.presence.heure_debut} → ${qr.presence.date_fin} ${qr.presence.heure_fin}</p>
                                ` : ''}
                              </div>
                            </div>
                            
                            <div class="qr-actions" style="display: flex; flex-direction: column; gap: 10px;">
                              <button class="btn btn-primary" onclick="showTimelineStats('${campaign.type}', '${qr.location_id || qr.location}')">
                                📈 Statistiques
                              </button>
                              <button class="btn ${qr.enabled ? 'btn-secondary' : 'btn-success'}" 
                                      onclick="toggleQRStatus('${campaign.type}', '${qr.location_id || qr.location}', ${qr.enabled || false})">
                                ${qr.enabled ? '🔒 Désactiver' : '🔓 Activer'}
                              </button>
                              <button class="btn btn-danger" onclick="deleteQR(${index}, ${qrIndex})">
                                🗑️ Supprimer
                              </button>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  ` : `
                    <div class="empty-state" style="text-align: center; padding: 40px;">
                      <div style="font-size: 48px; margin-bottom: 20px;">🏷️</div>
                      <p style="color: #666; font-size: 16px;">Aucun QR code créé pour cette campagne</p>
                      <p style="color: #999; font-size: 14px;">Utilisez le formulaire ci-dessus pour créer votre premier QR code</p>
                    </div>
                  `}
                </div>
              </div>
            </div>
          </div>

          <!-- Tab Paramètres -->
          <div id="tab-settings" class="tab-pane" style="display: none;">
            <div class="content-header">
              <h3 class="content-title">Paramètres de la campagne</h3>
              <p class="content-subtitle">Configurez le comportement de votre campagne</p>
            </div>
            
            <div class="content-body">
              <div class="content-section">
                <div class="section-content">
                  <div class="settings-group">
                    <h4 class="settings-title">Général</h4>
                    
                    <div class="setting-item" data-setting="campaign-status">
                      <label class="setting-label">
                        <span class="setting-icon">🔌</span>
                        Campagne active
                      </label>
                      
                      <div class="toggle-switch ${campaign.enabled ? 'active' : ''}" 
                           id="toggle-campaign-${campaign.type}"
                           onclick="toggleCampaignStatus(${index}); event.stopPropagation();">
                      </div>
                    </div>
                    <p class="danger-text">Désactiver une campagne désactive tous les QR et Codes associés</p>
                    
                    <div class="setting-item" data-setting="notifications">
                      <label class="setting-label">
                        <span class="setting-icon">🔔</span>
                        Notifications
                      </label>
                      <div class="toggle-switch ${campaign.notifications || false ? 'active' : ''}" 
                           id="toggle-notifications-${campaign.type}"
                           onclick="toggleSetting(this, '${campaign.type}', 'notifications'); event.stopPropagation();">
                      </div>
                    </div>
                    <p class="danger-text">Recevez une notification par mail lorsque de nouveaux scans sont enregistrés.</p>
                  </div>

                  <div class="danger-zone">
                    <h4 class="danger-title">Zone dangereuse</h4>
                    
                    <div class="setting-item" data-setting="blockchain">
                      <label class="setting-label">
                        <span class="setting-icon">🔒</span>
                        Vérification blockchain
                      </label>
                      
                      <div class="toggle-switch ${campaign.blockchain !== false ? 'active' : ''}" 
                           id="toggle-blockchain-${campaign.type}"
                           onclick="toggleSetting(this, '${campaign.type}', 'blockchain'); event.stopPropagation();">
                      </div>
                    </div>
                    <p class="danger-text">Désactiver l'enregistrement blockchain réduira la légitimité de la preuve.</p>
                    
                    <button class="btn-danger" onclick="deleteCampaign(${index})">
                      Supprimer la campagne
                    </button>
                    <p class="danger-text">Supprimer cette campagne effacera définitivement toutes les données associées.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tab Preuves -->
          <div id="tab-proof" class="tab-pane" style="display: none;">
            <div class="content-header">
              <h3 class="content-title">Dossier de preuves</h3>
              <p class="content-subtitle">Rassemblez tous vos documents justificatifs</p>
            </div>
            
            <div class="content-body">
              <div class="proof-upload-area" onclick="document.getElementById('proof-file-input').click()">
                <div class="proof-upload-icon">📎</div>
                <div class="proof-upload-text">Cliquez pour ajouter des fichiers</div>
                <div class="proof-upload-hint">ou glissez-déposez vos documents ici</div>
                <input type="file" id="proof-file-input" multiple style="display: none;" onchange="addProofFiles(event)" />
              </div>

              <div class="proof-files-grid" id="proof-files-grid">
                <!-- Les fichiers ajoutés apparaîtront ici -->
              </div>
              
              <button class="btn btn-secondary" onclick="generateProof('${campaign.type}')">
                📦 Générer une preuve seule
              </button>

              <button class="proof-generate-btn" onclick="generateFullProofZip('${campaign.type}')">
                🚀 Générer le dossier de preuves complet
              </button>
              
              <div id="proof-generation-message" class="status-message success" style="display: none;">
                ✅ Votre dossier de preuves est prêt !
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;

popupContainer.innerHTML = modalHTML;
  
  // Debug : vérifier ce qui se passe
  console.log("Campagne:", campaign);
  console.log("QR codes:", campaign.qrs);
  console.log("Stats data:", statsData);
 // Gérer la pseudonymisation si nécessaire
  if (campaign.type?.startsWith("pseudonymes_")) {
    initializePseudonymizationTools(campaign);
  }
  
  // Créer le graphique de la vue d'ensemble après un court délai
  setTimeout(() => {
    createOverviewChart(campaign, globalStatsData);
  }, 100);
}

function editQRName(campaignType, qrIndex) {
  const displayElement = document.getElementById(`qr-name-${campaignType}-${qrIndex}`);
  const editElement = document.getElementById(`qr-name-edit-${campaignType}-${qrIndex}`);
  
  displayElement.style.display = 'none';
  editElement.style.display = 'inline-block';
  editElement.focus();
  editElement.select();
}

function saveQRName(campaignType, oldLocationId, qrIndex) {
  const editElement = document.getElementById(`qr-name-edit-${campaignType}-${qrIndex}`);
  const displayElement = document.getElementById(`qr-name-${campaignType}-${qrIndex}`);
  const newName = editElement.value.trim();
  
  // Réafficher le display
  displayElement.style.display = 'inline-block';
  editElement.style.display = 'none';
  
  if (!newName || newName === oldLocationId) {
    return; // Pas de changement
  }
  
  showStatus("Renommage en cours...");
  
  fetch(`${SERVER_URL}/qrrename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      campaign_type: campaignType,
      old_location_id: oldLocationId,
      new_location_id: newName
    })
  })
  .then(res => {
    if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
    return res.text();
  })
  .then(() => {
    // Mettre à jour l'affichage
    displayElement.textContent = newName;
    
    // Mettre à jour l'objet local
    const campaign = window.campaigns.find(c => c.type === campaignType);
    if (campaign && campaign.qrs[qrIndex]) {
      campaign.qrs[qrIndex].location = newName;
      campaign.qrs[qrIndex].location_id = newName;
    }
    
    showStatus("QR code renommé avec succès");
  })
  .catch(error => {
    // Remettre l'ancien nom
    editElement.value = oldLocationId;
    displayElement.textContent = oldLocationId;
    
    console.error("Erreur lors du renommage:", error);
    showError("Erreur lors du renommage: " + error.message);
  });
}

function goToQRCodesList() {
  // Basculer vers l'onglet QR codes
  const qrTab = document.querySelector('.tab-nav-item:nth-child(2)');
  switchTab(qrTab, 'qr-codes');
  
  // Attendre que l'onglet soit affiché
  setTimeout(() => {
    const qrSection = document.getElementById('existing-qr-codes-section');
    if (qrSection) {
      // Scroller avec une marge pour que ce ne soit pas tout en haut
      const offsetTop = qrSection.offsetTop - 20;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
      
      // Ajouter une animation d'attention
      qrSection.style.transition = 'all 0.3s ease';
      qrSection.style.transform = 'scale(1.02)';
      qrSection.style.boxShadow = '0 0 20px rgba(0, 102, 204, 0.3)';
      qrSection.style.backgroundColor = '#e3f2fd';
      
      setTimeout(() => {
        qrSection.style.transform = 'scale(1)';
        qrSection.style.boxShadow = '';
        qrSection.style.backgroundColor = '';
      }, 1500);
    }
  }, 150);
}
// Exporter la fonction
window.goToQRCodesList = goToQRCodesList;

// Exporter les fonctions
window.editQRName = editQRName;
window.saveQRName = saveQRName;

// Fonction pour créer un graphique simple dans la vue d'ensemble
function createOverviewChart(campaign, statsData) {
  const canvasId = `overview-chart-${campaign.type}`;
  const canvas = document.getElementById(canvasId);
  
  if (!canvas || !window.Chart) {
    console.log("Canvas ou Chart.js non disponible");
    return;
  }
  
  const ctx = canvas.getContext('2d');
  const campaignStats = statsData[campaign.type];
  
  if (!campaignStats || !campaignStats.qrs) {
    // Afficher un message si aucune donnée
    ctx.font = '16px Arial';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('Aucune donnée de scan disponible', canvas.width / 2, canvas.height / 2);
    return;
  }
  
  // Préparer les données pour le graphique
  const qrCodes = Object.keys(campaignStats.qrs).slice(0, 10); // Limiter à 10 QR codes
  const scanCounts = qrCodes.map(qr => campaignStats.qrs[qr]);
  
  // Créer le graphique
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: qrCodes,
      datasets: [{
        label: 'Nombre de scans',
        data: scanCounts,
        backgroundColor: '#0066cc',
        borderColor: '#0051a3',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Répartition des scans par QR code'
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}



// Fonction pour les notifications
function toggleNotifications(element, campaignType) {
  const isActive = element.classList.contains('active');
  const newState = !isActive;
  
  if (newState) {
    element.classList.add('active');
  } else {
    element.classList.remove('active');
  }
  
  // Ici, ajoutez votre logique pour sauvegarder l'état des notifications
  showStatus(`Notifications ${newState ? 'activées' : 'désactivées'}`);
}

// Fonction pour la blockchain
function toggleBlockchain(element, campaignType) {
  const isActive = element.classList.contains('active');
  const newState = !isActive;
  
  if (newState) {
    element.classList.add('active');
  } else {
    element.classList.remove('active');
  }
  
  // Ici, ajoutez votre logique pour la blockchain
  showStatus(`Vérification blockchain ${newState ? 'activée' : 'désactivée'}`);
}
// Fonction pour gérer la pseudonymisation
function initializePseudonymizationTools(campaign) {
  const btnContainer = document.querySelector(".qr-header");
  if (!btnContainer) return;

  const toolsWrapper = document.createElement("div");
  toolsWrapper.className = "pseudonym-tools";
  toolsWrapper.style.marginTop = "10px";

  const toggleIdentitiesBtn = document.createElement("button");
  toggleIdentitiesBtn.className = "btn btn-light toggle-identities-btn";
  toggleIdentitiesBtn.textContent = "👁 Identités";
  toggleIdentitiesBtn.onclick = () => toggleIdentitiesForCampaign(campaign.type);
  
  const exportBtn = document.createElement("button");
  exportBtn.className = "btn btn-light";
  exportBtn.textContent = "💾 Sauvegarder";
  exportBtn.onclick = () => exportEncryptedMapping();
  
  const importLabel = document.createElement("label");
  importLabel.className = "btn btn-light";
  importLabel.innerHTML = `📂 Restaurer <input type="file" style="display:none" accept=".json" onchange="importEncryptedMappingFromPopup(this)" />`;
  
  toolsWrapper.appendChild(toggleIdentitiesBtn);
  toolsWrapper.appendChild(exportBtn);
  toolsWrapper.appendChild(importLabel);
  
  btnContainer.appendChild(toolsWrapper);
}

function switchTab(button, tabId) {
  // Désactiver tous les onglets et boutons
  document.querySelectorAll('.tab-nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
    pane.style.display = 'none';
  });
  
  // Activer l'onglet sélectionné
  button.classList.add('active');
  const targetTab = document.getElementById('tab-' + tabId);
  if (targetTab) {
    targetTab.classList.add('active');
    targetTab.style.display = 'block';
  }
}

// Fonction pour basculer les champs selon le mode QR
function toggleQRModeFields(selectElement) {
  const form = selectElement.closest('form');
  const mode = selectElement.value;
  
  // Masquer tous les conteneurs de mode
  form.querySelector('.mode-passage').style.display = 'none';
  form.querySelector('.mode-presence').style.display = 'none';
  
  // Afficher le mode sélectionné
  if (mode === 'passage') {
    form.querySelector('.mode-passage').style.display = 'block';
  } else if (mode === 'presence') {
    form.querySelector('.mode-presence').style.display = 'block';
  }
}

// Fonction pour gérer les toggle switches des paramètres
function toggleSetting(element, campaignType, settingName) {
  // Empêcher la propagation de l'événement
  event.stopPropagation();
  
  // Toggle visuel immédiat
  const isActive = element.classList.contains('active');
  const newState = !isActive;
  
  if (newState) {
    element.classList.add('active');
  } else {
    element.classList.remove('active');
  }
  
  // Sauvegarder l'état (à implémenter selon vos besoins)
  // Par exemple : envoi au serveur ou sauvegarde locale
  
  // Message de confirmation
  showStatus(`${settingName === 'notifications' ? 'Notifications' : 'Vérification blockchain'} ${newState ? 'activée(s)' : 'désactivée(s)'}`);
}




function updateProofFilesDisplay() {
  const grid = document.getElementById('proof-files-grid');
  grid.innerHTML = '';
  
  proofFiles.forEach((file, index) => {
    const fileCard = document.createElement('div');
    fileCard.className = 'proof-file-card';
    
    const fileIcon = getFileIcon(file.type);
    const fileSize = formatFileSize(file.size);
    
    fileCard.innerHTML = `
      <div class="proof-file-icon">${fileIcon}</div>
      <div class="proof-file-name" title="${file.name}">${file.name}</div>
      <div class="proof-file-size">${fileSize}</div>
      <button class="proof-file-remove" onclick="removeProofFile(${index})">×</button>
    `;
    
    grid.appendChild(fileCard);
  });
}


function getFileIcon(fileType) {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎥';
  if (fileType.includes('pdf')) return '📑';
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('document') || fileType.includes('word')) return '📝';
  return '📄';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Fonctions utilitaires pour la nouvelle structure
function toggleDescriptionEdit(campaignType) {
  const viewEl = document.getElementById(`description-view-${campaignType}`);
  const editEl = document.getElementById(`description-edit-${campaignType}`);
  
  viewEl.style.display = 'none';
  editEl.style.display = 'block';
}

function addProofFiles(event) {
  const files = Array.from(event.target.files);
  proofFiles.push(...files);
  updateProofFilesDisplay();
}

function addProofFiles(event) {
  const files = Array.from(event.target.files);
  proofFiles.push(...files);
  updateProofFilesDisplay();
}


function cancelDescriptionEdit(campaignType) {
  const viewEl = document.getElementById(`description-view-${campaignType}`);
  const editEl = document.getElementById(`description-edit-${campaignType}`);
  
  viewEl.style.display = 'block';
  editEl.style.display = 'none';
}

function saveDescription(campaignType) {
  const textarea = document.getElementById(`description-${campaignType}`);
  const newDescription = textarea.value;

  fetch(`${SERVER_URL}/campaignupdatedescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: campaignType, description: newDescription })
  })
  .then(res => {
    if (!res.ok) throw new Error('Erreur serveur');
    return res.text();
  })
  .then(() => {
    showStatus("Description mise à jour avec succès");
  })
  .catch(err => {
    showError("Erreur lors de la mise à jour de la description: " + err.message);
  });
}
function toggleQRView(button) {
  const qrList = button.closest('.qr-list-container').querySelector('.qr-list');
  
  if (qrList.classList.contains('grid-view')) {
    qrList.classList.remove('grid-view');
    qrList.classList.add('list-view');
    button.innerHTML = '<span>📋</span> Vue liste';
  } else {
    qrList.classList.remove('list-view');
    qrList.classList.add('grid-view');
    button.innerHTML = '<span>🔲</span> Vue grille';
  }
}

// Fonction pour initialiser les gestionnaires d'événements
function initQRClickHandlers() {
  console.log("Initialisation des gestionnaires d'événements QR...");
  
  // Ajouter directement des gestionnaires sur chaque bloc QR
  document.querySelectorAll('.qr-block').forEach(qrBlock => {
    console.log("Attribution du gestionnaire de clic à un QR block", qrBlock);
    
    // Supprimer les gestionnaires existants pour éviter les doublons
    qrBlock.removeEventListener('click', handleQRBlockClick);
    
    // Ajouter le nouveau gestionnaire
    qrBlock.addEventListener('click', handleQRBlockClick);
  });
  
  // Afficher un message de confirmation
  console.log(`Initialisation terminée pour ${document.querySelectorAll('.qr-block').length} QR codes`);
}

function toggleQRModeFields(selectElement) {
  const form = selectElement.closest('form');
  const mode = selectElement.value;

  form.querySelectorAll('.qr-mode-fields').forEach(div => div.style.display = 'none');
  if (mode === 'passage') {
    form.querySelector('.mode-passage').style.display = 'block';
  } else if (mode === 'presence') {
    form.querySelector('.mode-presence').style.display = 'block';
  }
}


// Fonction de gestionnaire de clic dédiée
function handleQRBlockClick(e) {
  // Ne pas traiter les clics sur les boutons ou liens
  if (e.target.closest('button') || e.target.closest('a')) {
    console.log("Clic ignoré car sur un bouton ou un lien");
    return;
  }
  
  console.log("Clic détecté sur un bloc QR", e.currentTarget);
  
  // Récupérer le bloc QR
  const qrBlock = e.currentTarget;
  
  // Récupérer les informations du QR code et de la campagne
  const campaignPopup = qrBlock.closest('.campaign-popup');
  if (campaignPopup) {
    const campaignTitle = campaignPopup.querySelector('.popup-title').textContent;
    console.log("Titre de la campagne:", campaignTitle);
    
    // Extraire le type de campagne du titre (entre parenthèses)
    const campaignTypeMatch = campaignTitle.match(/\(([^)]+)\)/);
    if (campaignTypeMatch && campaignTypeMatch[1]) {
      const campaignType = campaignTypeMatch[1];
      
      // Récupérer l'emplacement du QR code
      const locationElement = qrBlock.querySelector('.qr-title');
      if (locationElement) {
        const locationId = locationElement.textContent;
        console.log(`Clic traité sur le lieu ${locationId} de la campagne ${campaignType}`);
        
        // Ouvrir les statistiques temporelles pour ce QR code
        showTimelineStats(campaignType, locationId);
      } else {
        console.warn("Élément .qr-title non trouvé dans le bloc QR");
      }
    } else {
      console.warn("Type de campagne non trouvé dans le titre:", campaignTitle);
    }
  } else {
    console.warn("Popup de campagne parent non trouvé");
  }
}

// Fonction pour fermer un popup
function closePopup(button) {
  const popup = button.closest(".campaign-popup, .client-export-modal");
  popup.parentNode.removeChild(popup);
}

// Fonction pour afficher/masquer les QR codes
function toggleQRDisplay(button) {
  const qrContainer = button.closest(".popup-section").querySelector(".qr-container");
  const isVisible = qrContainer.classList.toggle("visible");

  // Met à jour le texte du bouton
  button.innerHTML = isVisible
    ? '<span>🔍 Masquer les QR codes</span>'
    : '<span>👁️ Voir les QR codes</span>';

  // Affiche ou masque les outils pseudonymisation si présents
  const tools = button.closest(".campaign-popup-content")?.querySelector(".pseudonym-tools");
  if (tools) {
    tools.style.display = isVisible ? "inline-block" : "none";
  }
}


// Fonction pour convertir les boutons en icônes
function convertButtonsToIcons() {
  document.querySelectorAll('button').forEach(button => {
    // Ne pas remplacer les boutons déjà convertis ou les boutons de fermeture
    if (button.classList.contains('icon-btn') || button.classList.contains('popup-close')) {
      return;
    }
    
    const buttonText = button.textContent.trim().toLowerCase();
    
    // Déterminer le type de bouton en fonction du texte
    let iconType = '';
    let btnClass = '';
    
    if (buttonText.includes('json')) {
      iconType = 'export_json';
      btnClass = 'export';
    } else if (buttonText.includes('pdf')) {
      iconType = 'export_pdf';
      btnClass = 'export';
    } else if (buttonText.includes('visualiser') || buttonText.includes('stats')) {
      iconType = 'visualiser';
      btnClass = 'stats';
    } else if (buttonText.includes('blockchain')) {
      iconType = 'blockchain';
      btnClass = 'stats';
    } else if (buttonText.includes('activer')) {
      iconType = 'activer';
      btnClass = 'toggle';
    } else if (buttonText.includes('désactiver')) {
      iconType = 'desactiver';
      btnClass = 'toggle';
    } else if (buttonText.includes('supprimer')) {
      iconType = 'supprimer';
      btnClass = 'delete';
    } else if (buttonText.includes('télécharger') || buttonText.includes('download')) {
      iconType = 'telecharger';
      btnClass = 'export';
    } else if (buttonText.includes('géné')) {
      iconType = 'generer';
      btnClass = 'edit';
    } else if (buttonText.includes('config')) {
      iconType = 'configurer';
      btnClass = 'edit';
    }
    
    // Si un type d'icône a été identifié, mettre à jour les classes
    if (iconType) {
      button.className = `icon-btn ${btnClass}`;
      button.setAttribute('data-tooltip', buttonText);
    }
  });
}

// Observer les changements du DOM pour appliquer les styles aux nouveaux éléments
function observeCampaignPopups() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes && mutation.addedNodes.length) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.classList && (
              node.classList.contains('campaign-popup') || 
              node.classList.contains('popup-section-content'))) {
            setTimeout(() => {
              convertButtonsToIcons();
              initQRClickHandlers();
            }, 100);
            break;
          }
        }
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}




function showBlockchainVerification(campaignType, locationId = null) {
  // Afficher un indicateur de chargement
  showStatus("Chargement des données blockchain...");
  
  // Construire l'URL avec les filtres
  let url = `${SERVER_URL}/blockchain-scans?scan_type=${encodeURIComponent(campaignType)}`;
  if (locationId) {
    url += `&location_id=${encodeURIComponent(locationId)}`;
  }
  
  // Récupérer les données
  fetch(url)
    .then(res => {
      if (!res.ok) {
        throw new Error(`Erreur serveur: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("Données blockchain reçues:", data);
        console.log("Détail des rows:", JSON.stringify(data.rows, null, 2)); // 
      // Ne pas filtrer les données - juste vérifier qu'on en a
      if (!data.rows || !Array.isArray(data.rows)) {
        showError("Format de données blockchain invalide");
        return;
      }
      
      // Si aucune donnée, afficher un message approprié
      if (data.rows.length === 0) {
        showError("Aucune donnée blockchain disponible pour ces critères");
        return;
      }
      
      // Créer un overlay pour la nouvelle popup
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
      `;
      
      // Créer le conteneur de la modale
      const modal = document.createElement('div');
      modal.style.cssText = `
        background: white;
        width: 90%;
        max-width: 900px;
        max-height: 90vh;
        overflow: auto;
        border-radius: 8px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        position: relative;
      `;
      
      // Contenu de la modale
      const modalContent = document.createElement('div');
      modalContent.style.cssText = `
        padding: 30px;
      `;
      
      // Bouton de fermeture
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        border: none;
        background: none;
        font-size: 28px;
        cursor: pointer;
        color: #333;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s ease;
      `;
      closeButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      closeButton.addEventListener('mouseenter', function() {
        this.style.background = '#f0f0f0';
      });
      closeButton.addEventListener('mouseleave', function() {
        this.style.background = 'none';
      });
      
      // Clic sur l'overlay pour fermer
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
        }
      });
      
      // Titre
      const title = document.createElement('h2');
      title.textContent = locationId 
        ? `Vérification blockchain : ${locationId} (${campaignType})` 
        : `Vérification blockchain : Campagne ${campaignType}`;
      title.style.cssText = `
        margin: 0 0 20px 0;
        color: #0066cc;
      `;
      
      // Information sur la blockchain
      const infoBox = document.createElement('div');
      infoBox.style.cssText = `
        background-color: #f8f9fa;
        border-left: 5px solid #0066cc;
        padding: 15px;
        margin-bottom: 20px;
      `;
      infoBox.innerHTML = `
        <p style="margin: 5px 0;"><strong>Certification blockchain WAX</strong></p>
        <p style="margin: 5px 0;">Les scans ci-dessous ont été enregistrés de manière immuable sur la blockchain WAX.</p>
        <p style="margin: 5px 0;">Vous pouvez vérifier l'authenticité de chaque scan en cliquant sur son hash de transaction.</p>
        <p style="margin: 5px 0;"><strong>Dernière mise à jour:</strong> ${new Date().toLocaleString()}</p>
      `;
      
      // Tableau des résultats
      const table = document.createElement('table');
      table.style.cssText = `
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      `;
      
      // En-tête du tableau
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr>
          <th style="border: 1px solid #ddd; padding: 12px; background-color: #f2f2f2;">ID</th>
          <th style="border: 1px solid #ddd; padding: 12px; background-color: #f2f2f2;">UUID</th>
          <th style="border: 1px solid #ddd; padding: 12px; background-color: #f2f2f2;">Emplacement</th>
          <th style="border: 1px solid #ddd; padding: 12px; background-color: #f2f2f2;">Date</th>
          <th style="border: 1px solid #ddd; padding: 12px; background-color: #f2f2f2;">Hash transaction</th>
          <th style="border: 1px solid #ddd; padding: 12px; background-color: #f2f2f2;">Bloc</th>
        </tr>
      `;
      
      // Corps du tableau
      const tbody = document.createElement('tbody');
      
      data.rows.forEach(scan => {
        // Debug: voir toutes les propriétés de scan
        console.log("Données du scan:", scan);
        
        // Gestion flexible de la date
        let formattedDate = 'Date non disponible';
        if (scan.timestamp) {
          // Format utc_seconds comme dans votre capture
          if (scan.timestamp.utc_seconds) {
            const date = new Date(scan.timestamp.utc_seconds * 1000);
            formattedDate = date.toLocaleString('fr-FR');
          } 
          // Autres formats possibles
          else if (typeof scan.timestamp === 'number') {
            const date = new Date(scan.timestamp * 1000);
            formattedDate = date.toLocaleString('fr-FR');
          } else if (typeof scan.timestamp === 'string') {
            formattedDate = new Date(scan.timestamp).toLocaleString('fr-FR');
          }
        }
        
        // Vérifier la présence de transaction_id (parfois c'est tx_id ou autre)
       const transactionId = scan.transaction_id || scan.tx_id || scan.trx_id || null;
const blockNum = scan.block_num || scan.block || scan.block_number || null;

const tr = document.createElement('tr');
tr.innerHTML = `
  <td style="border: 1px solid #ddd; padding: 12px;">
    ${scan.id !== undefined ? scan.id : 'N/A'}
  </td>
  <td style="border: 1px solid #ddd; padding: 12px;">
    ${scan.uuid || 'N/A'}
  </td>
  <td style="border: 1px solid #ddd; padding: 12px;">
    ${scan.location_id || 'N/A'}
  </td>
  <td style="border: 1px solid #ddd; padding: 12px;">
    ${formattedDate}
  </td>
  <td style="border: 1px solid #ddd; padding: 12px;">
    ${transactionId ? `
      <span style="color: #0066cc; cursor: pointer; text-decoration: underline;" 
            onclick="window.open('https://waxblock.io/transaction/${transactionId}', '_blank')">
        ${transactionId.substring(0, 8)}...${transactionId.substring(transactionId.length - 4)}
      </span>
      <span style="cursor: pointer; margin-left: 5px;" 
            onclick="navigator.clipboard.writeText('${transactionId}').then(() => alert('Hash copié!'))">
        📋
      </span>
    ` : 'N/A'}
  </td>
  <td style="border: 1px solid #ddd; padding: 12px;">
    ${blockNum || 'N/A'}
  </td>
`;
        tbody.appendChild(tr);
      });
      
      table.appendChild(thead);
      table.appendChild(tbody);
      
      // Assembler la modale
      modal.appendChild(closeButton);
      modalContent.appendChild(title);
      modalContent.appendChild(infoBox);
      modalContent.appendChild(table);
      modal.appendChild(modalContent);
      overlay.appendChild(modal);
      
      // Ajouter la modale au document
      document.body.appendChild(overlay);
      
      showStatus("Données blockchain chargées");
    })
    .catch(err => {
      console.error("Erreur lors du chargement des données blockchain:", err);
      showError("Impossible de charger les données blockchain: " + err.message);
    });
}
// Fonction pour copier dans le presse-papier
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      showStatus("Hash copié dans le presse-papier");
    })
    .catch(err => {
      console.error("Erreur lors de la copie:", err);
      showError("Impossible de copier le hash");
    });
}

// Initialiser les observateurs au chargement
window.addEventListener('load', function() {
  // Convertir les boutons existants
  convertButtonsToIcons();
  
  // Observer les changements pour détecter les popups de campagne
  observeCampaignPopups();
});

// Export global en JSON
function exportGlobalJSON() {
  fetch(`${SERVER_URL}/stats`)
    .then(res => res.json())
    .then(stats => {
      return fetch(`${SERVER_URL}/campaigns`)
        .then(res => res.json())
        .then(campaigns => {
          const exportData = createStatsExport(stats, campaigns);
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "qrtracker_stats.json";
          a.click();
          URL.revokeObjectURL(url);
          showStatus("Export JSON effectué !");
        });
    })
    .catch(err => {
      showError("Erreur export JSON : " + err.message);
    });
}

function exportGlobalXLS() {
  fetch(`${SERVER_URL}/stats`)
    .then(res => res.json())
    .then(stats => {
      return fetch(`${SERVER_URL}/campaigns`)
        .then(res => res.json())
        .then(campaigns => {
          const exportData = createStatsExport(stats, campaigns);

          // Construire les données sous forme de tableau pour Excel
          const worksheetData = [
            ["Campagne", "Description", "QR Code", "Scans", "Max/UUID", "%"]
          ];

          exportData.forEach(entry => {
            const campaign = campaigns.find(c => c.type === entry.campaign);
            worksheetData.push([
              entry.campaign,
              campaign?.description || "",
              entry.qr,
              entry.scans,
              entry.max_scans,
              entry.percentage
            ]);
          });

          // Créer la feuille Excel avec SheetJS
          const ws = XLSX.utils.aoa_to_sheet(worksheetData);

          // Définir la hauteur des lignes (0.95 cm = ~27 points Excel)
          const rowHeights = worksheetData.map(() => ({ hpt: 27 }));
          ws["!rows"] = rowHeights;

          // Définir la largeur auto-ajustée (sera affinée à l'ouverture par Excel)
          ws["!cols"] = [
            { wch: 20 },  // Campagne
            { wch: 30 },  // Description
            { wch: 25 },  // QR Code
            { wch: 10 },  // Scans
            { wch: 12 },  // Max/UUID
            { wch: 8 }    // %
          ];

          // Créer le classeur
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Statistiques");

          // Exporter le fichier
          XLSX.writeFile(wb, "qrtracker_stats.xlsx");

          showStatus("Export XLSX réussi !");
        });
    })
    .catch(err => {
      showError("Erreur export XLSX : " + err.message);
    });
}




// Fonction commune pour construire les données comme dans le PDF
function createStatsExport(stats, campaigns) {
  const result = [];

  for (const campaignType in stats) {
    const data = stats[campaignType];
    const campaign = campaigns.find(c => c.type === campaignType);
    const total = Object.values(data.qrs).reduce((a, b) => a + b, 0);

    for (const qr in data.qrs) {
      const count = data.qrs[qr];
      const qrMeta = campaign?.qrs.find(q =>
        q.location === qr || q.location_id === qr
      );
      let maxScans;
if (qrMeta?.mode === "presence") {
  maxScans = `Présence: ${qrMeta.presence?.nombre_personnes || 1} personnes`;
} else {
  maxScans = qrMeta?.max_scans_per_uuid || 1;
}

      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) + "%" : "0%";

      result.push({
        campaign: campaignType,
        qr,
        scans: count,
        max_scans: maxScans,
        percentage
      });
    }
  }

  return result;
}


async function getDecryptedMapping() {
  const encrypted = localStorage.getItem('pseudonymisation_encrypted');
  if (!encrypted) return null;

  const { iv, data } = JSON.parse(encrypted);
  const ivBytes = new Uint8Array(iv);
  const ciphertext = new Uint8Array(data);

  try {
    if (!window.encryptionKey) return null;

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      window.encryptionKey,
      ciphertext
    );
    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  } catch (err) {
    console.error("❌ Erreur déchiffrement :", err);
    return null;
  }
}

async function toggleIdentitiesForCampaign(campaignType) {
  const allPopups = document.querySelectorAll('.campaign-popup-content');
  let popup = null;

  for (const p of allPopups) {
    const title = p.querySelector('h2');
    if (title && title.textContent.includes(campaignType)) {
      popup = p;
      break;
    }
  }

  if (!popup) return;

  // Toggle ON/OFF
  const alreadyVisible = popup.classList.contains('identities-visible');
  popup.classList.toggle('identities-visible');

  // Clean up si déjà affiché
  popup.querySelectorAll('.identity-info').forEach(e => e.remove());
  if (alreadyVisible) return;

  const mapping = await getDecryptedMapping();
  if (!mapping) return;

  popup.querySelectorAll('.qr-block').forEach(block => {
    const id = block.querySelector('.qr-title')?.textContent.trim();
    const data = mapping.find(p => p.id === id);
    if (!data) return;

    const info = document.createElement('div');
    info.className = 'identity-info';
    info.innerHTML = `
      👤 <strong>${data.prenom} ${data.nom}</strong><br/>
      🧑‍🤝‍🧑 Groupe : ${data.groupe || 'n/a'}
    `;
    block.querySelector('.qr-info')?.appendChild(info);
  });
}

async function getDecryptedMapping() {
  const encrypted = localStorage.getItem('pseudonymisation_encrypted');
  if (!encrypted) return null;

  const { iv, data } = JSON.parse(encrypted);
  const ivBytes = new Uint8Array(iv);
  const ciphertext = new Uint8Array(data);

  try {
    if (!window.encryptionKey) return null;

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      window.encryptionKey,
      ciphertext
    );
    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  } catch (err) {
    console.error("❌ Erreur déchiffrement :", err);
    return null;
  }
}

// 🔐 Affiche ou masque les identités pseudonymisées dans la campagne
function toggleIdentitiesForCampaign(campaignType) {
  const encrypted = localStorage.getItem('pseudonymisation_encrypted');
  if (!encrypted) return showError("Aucune donnée pseudonymisée disponible localement");

  try {
    const { iv, data } = JSON.parse(encrypted);
    const ivBuffer = new Uint8Array(iv);
    const dataBuffer = new Uint8Array(data);

    const keyBase64 = localStorage.getItem('pseudonymisation_key');
    const keyBytes = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    
    crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']).then(key => {
      crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuffer }, key, dataBuffer)
        .then(decrypted => {
          const decoded = new TextDecoder().decode(decrypted);
          const mapping = JSON.parse(decoded);

          // Pour chaque bloc QR visible, ajouter les infos si elles existent
          document.querySelectorAll('.qr-block').forEach(block => {
            const title = block.querySelector('.qr-title')?.textContent?.trim();
            const infoBlock = block.querySelector('.qr-info');

            if (!infoBlock || !title) return;

            const found = mapping.find(m => m.id === title);
            if (!found) return;

            let existing = infoBlock.querySelector('.qr-identite');
            if (existing) {
              existing.remove();
              return;
            }

            const identityDiv = document.createElement('div');
            identityDiv.className = 'qr-identite';
            identityDiv.innerHTML = `
              <hr style="margin:5px 0;">
              <div class="identite-label"><strong>${found.prenom} ${found.nom}</strong></div>
              <div class="identite-groupe">🧑‍🤝‍🧑 Groupe : ${found.groupe}</div>
            `;
            infoBlock.appendChild(identityDiv);
          });
        })
        .catch(err => {
          console.error("Erreur de déchiffrement:", err);
          showError("Impossible de déchiffrer les identités");
        });
    });
  } catch (err) {
    console.error("Erreur lors du traitement du mapping pseudonyme:", err);
    showError("Erreur lors du chargement des identités");
  }
}

function exportEncryptedMapping() {
  const encryptedData = localStorage.getItem('pseudonymisation_encrypted');
  const encryptionKey = localStorage.getItem('pseudonymisation_key');

  if (!encryptedData || !encryptionKey) {
    showError("❌ Aucune donnée pseudonymisée à sauvegarder.");
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

async function importEncryptedMappingFromPopup(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (event) {
    try {
      const content = JSON.parse(event.target.result);

      if (content.type !== "pseudonymisation_backup" || !content.key || !content.data) {
        throw new Error("Fichier de sauvegarde invalide.");
      }

      localStorage.setItem('pseudonymisation_key', content.key);
      localStorage.setItem('pseudonymisation_encrypted', JSON.stringify(content.data));

      window.encryptionKey = await crypto.subtle.importKey(
        'raw',
        Uint8Array.from(atob(content.key), c => c.charCodeAt(0)),
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
      );

      showStatus("✅ Données pseudonymisées restaurées !");
    } catch (err) {
      console.error(err);
      showError("❌ Erreur à l'import : " + err.message);
    }
  };

  reader.readAsText(file);
}


function updateCampaignName(campaignType) {
  const input = document.getElementById(`input-name-${campaignType}`);
  const status = document.getElementById(`campaign-name-status-${campaignType}`);
  const display = document.getElementById(`campaign-name-display-${campaignType}`);
  const edit = document.getElementById(`campaign-name-edit-${campaignType}`);
  const newName = input?.value.trim();
  if (!newName) return showError("Le nom de campagne ne peut pas être vide.");

  fetch('/campaignrename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: campaignType, name: newName })
  })
  .then(res => {
    if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
    return res.text();
  })
  .then(() => {
    // Mettre à jour l'affichage du nom
    if (display) {
      display.textContent = newName;
      display.style.display = 'inline';
    }
    if (edit) edit.style.display = 'none';

    if (status) {
      status.style.display = 'inline';
      status.textContent = "✅ Nom enregistré";
      setTimeout(() => status.style.display = 'none', 2000);
    }

    showStatus("✅ Nom de campagne mis à jour !");
    loadCampaigns();
  })
  .catch(err => {
    console.error("Erreur renommage:", err);
    showError("Impossible de modifier le nom de la campagne.");
  });
}

function showCampaignNameEdit(campaignType) {
  const display = document.getElementById(`campaign-name-display-${campaignType}`);
  const edit = document.getElementById(`campaign-name-edit-${campaignType}`);
  if (display) display.style.display = 'none';
  if (edit) edit.style.display = 'inline-flex';
}

function showCenterMessage(text, duration = 3000) {
  const el = document.getElementById('center-message');
  if (!el) return;

  el.textContent = text;
  el.style.display = 'block';

  setTimeout(() => {
    el.style.display = 'none';
  }, duration);
}


function improveDescription(type) {
  const textarea = document.getElementById(`description-${type}`);
  const original = textarea.value;

  if (!original || original.trim().length < 10) {
    alert("Ajoutez une description plus complète pour l'améliorer.");
    return;
  }

  textarea.disabled = true;
  textarea.value = "⏳ Amélioration en cours...";

  fetch("/improve-description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: original })
  })
    .then(async res => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res.json();
})
    .then(data => {
      textarea.value = data.improved || "Erreur IA.";
    })
    .catch(err => {
      console.error("Erreur IA", err);
      textarea.value = original;
      alert("Erreur lors de la requête GPT");
    })
    .finally(() => {
      textarea.disabled = false;
    });
}

window.closeCampaignPopup = function () {
  const container = document.getElementById("campaign-popup-container");
  if (container) container.innerHTML = "";
};
// Fonction pour générer la preuve blockchain (zip contenant PDF + JSON + CSV)
function generateProof(campaignType) {
  showStatus("Génération de la preuve en cours...");
  
  // Récupérer les données nécessaires
  Promise.all([
    fetch(`${SERVER_URL}/stats`).then(res => res.json()),
    fetch(`${SERVER_URL}/campaigns`).then(res => res.json()),
    fetch(`${SERVER_URL}/scanlogs?type=${encodeURIComponent(campaignType)}`).then(res => res.json()),
    fetch(`${SERVER_URL}/blockchain-scans?scan_type=${encodeURIComponent(campaignType)}`).then(res => res.json())
  ])
  .then(async ([statsData, campaignsData, scanlogsData, blockchainData]) => {
    // Filtrer les données blockchain pour ne garder que les vraies entrées
    if (blockchainData && blockchainData.rows) {
      blockchainData.rows = blockchainData.rows.filter(row => {
        // Vérifier que ce n'est pas une donnée factice
        return row.uuid && row.location_id && row.transaction_id && row.block_num > 0;
      });
    }
    
    // Récupérer les informations de la campagne
    const campaign = campaignsData.find(c => c.type === campaignType);
    if (!campaign) throw new Error("Campagne introuvable");
    
    // Générer un nom de fichier unique basé sur la date
    const dateStr = new Date().toISOString().slice(0, 10);
    const filePrefix = `preuve_${campaignType}_${dateStr}`;
    const htmlFilename = `verification_blockchain_${campaignType}.html`;
    
    // 1. Créer le PDF avec un lien vers le fichier HTML local
    const pdfBlob = await createStatsPDFBlob(
      { [campaignType]: statsData[campaignType] }, 
      [campaign],
      htmlFilename,  // Passer le nom du fichier HTML
      campaignType
    );
    
    // 2. Créer le fichier JSON des données
    const jsonData = {
      campaign: campaign,
      stats: statsData[campaignType],
      scans: scanlogsData,
      timestamp: new Date().toISOString(),
      blockchain_verification_url: `https://waxblock.io/account/trackerscan`
    };
    const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    
    // 3. Créer le fichier JSON des données blockchain
    const blockchainJsonBlob = new Blob([JSON.stringify(blockchainData, null, 2)], { type: 'application/json' });
    
    // 4. Créer le fichier CSV des scans
    const csvContent = [
      // En-tête CSV
      'UUID,Location,Date,Heure,Transaction',
      // Données des scans
      ...scanlogsData.map(scan => {
        const date = new Date(scan.timestamp * 1000);
        const dateStr = date.toLocaleDateString('fr-FR');
        const timeStr = date.toLocaleTimeString('fr-FR');
        return `${scan.uuid},${scan.location_id},${dateStr},${timeStr},${scan.transaction_id || 'N/A'}`;
      })
    ].join('\n');
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    
    // 5. Créer le fichier HTML de vérification blockchain
    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vérification Blockchain - QR Tracker</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #0066cc;
            margin-top: 0;
        }
        .verification-info {
            background-color: #f8f9fa;
            border-left: 5px solid #0066cc;
            padding: 15px;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .tx-hash {
            color: #0066cc;
            cursor: pointer;
            text-decoration: underline;
        }
        .copy-icon {
            cursor: pointer;
            margin-left: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Vérification blockchain: Campagne ${campaign.name} (${campaignType})</h1>
        
        <div class="verification-info">
            <p><strong>Certification blockchain WAX</strong></p>
            <p>Les scans ci-dessous ont été enregistrés de manière immuable sur la blockchain WAX.</p>
            <p>Vous pouvez vérifier l'authenticité de chaque scan en cliquant sur son hash de transaction.</p>
            <p><strong>Dernière mise à jour:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>UUID</th>
                    <th>Emplacement</th>
                    <th>Date</th>
                    <th>Hash transaction</th>
                    <th>Bloc</th>
                </tr>
            </thead>
            <body>
                ${blockchainData.rows && blockchainData.rows.length > 0 && blockchainData.rows.some(r => r.transaction_id) ? 
  blockchainData.rows.filter(scan => scan.transaction_id && scan.block_num > 0).map(scan => {
                    const date = new Date(scan.timestamp.utc_seconds * 1000);
                    const formattedDate = date.toLocaleString('fr-FR');
                    return `
                      <tr>
                        <td>${scan.id}</td>
                        <td>${scan.uuid}</td>
                        <td>${scan.location_id}</td>
                        <td>${formattedDate}</td>
                        <td>
                          <span class="tx-hash" title="Cliquer pour voir la transaction" 
                                onclick="window.open('https://waxblock.io/transaction/${scan.transaction_id}', '_blank')">
                            ${scan.transaction_id.substring(0, 8)}...${scan.transaction_id.substring(scan.transaction_id.length - 4)}
                          </span>
                          <span class="copy-icon" title="Copier le hash" onclick="navigator.clipboard.writeText('${scan.transaction_id}').then(() => alert('Hash copié!'))">
                            📋
                          </span>
                        </td>
                        <td>${scan.block_num}</td>
                      </tr>
                    `;
                  }).join('') : 
                  '<tr><td colspan="6" style="text-align: center;">Aucune donnée blockchain disponible pour cette campagne</td></tr>'
                }
            </tbody>
        </table>
        
        <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
            Le Règlement eIDAS (UE 910/2014) prône la valeur probante de la preuve numérique scellée, recommandant des technologies comme la blockchain pour l'horodatage, la non-répudiation, et l'auditabilité : "Les technologies de registre distribué permettent de garantir l'intégrité et la traçabilité des preuves, conformément aux attentes d'opposabilité légale." (Source : eIDAS - Commission européenne). Ce document permet à son porteur de pouvoir produire une preuve de réalisation infalsifiable, opposable en cas de contrôle. Elle est archivée indéfiniment sur la blockchain.
        </div>
    </div>
</body>
</html>`;
    
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    
    // 6. Créer le ZIP
    const zip = new JSZip();
    
    // Ajouter les fichiers au ZIP
    zip.file(`${filePrefix}.pdf`, pdfBlob);
    zip.file(`donnees_${campaignType}.json`, jsonBlob);
    zip.file(`donnees_${campaignType}_blockchain.json`, blockchainJsonBlob);
    zip.file(`scans_${campaignType}.csv`, csvBlob);
    zip.file(htmlFilename, htmlBlob);
    
    // Générer le ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Télécharger le ZIP
    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = `preuve_campagne_${campaignType}_${dateStr}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(zipUrl);
    
    showStatus("✅ Preuve générée et téléchargée avec succès !");
  })
  .catch(err => {
    console.error("Erreur lors de la génération de la preuve:", err);
    showError("Impossible de générer la preuve: " + err.message);
  });
}

function switchCampaignTab(button, targetId) {
  // Supprimer la classe active de tous les boutons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  // Masquer toutes les sections
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');

  // Activer le bon bouton et afficher la bonne section
  button.classList.add('active');
  document.getElementById(targetId).style.display = 'block';
}


document.addEventListener('DOMContentLoaded', () => {
  const proofButton = document.getElementById('generate-proof-zip');
  if (proofButton) {
    proofButton.addEventListener('click', async () => {
      await generateFullProofZip();
    });
  }
});

window.generatedPdfBlob = new Blob(["Preuve PDF générée localement."], { type: "application/pdf" });

window.generatedJsonStats = {
  campagne: "demo",
  date: new Date().toISOString(),
  stats: {
    visiteurs: 42,
    lieux: ["Musée Grévin", "Centre Culturel"]
  }
};

window.generatedCsvStats = `Lieu,Visiteurs\nMusée Grévin,20\nCentre Culturel,22`;

async function generateProofFilesForZip(campaignType) {  // Ajouter le paramètre
  showStatus("Préparation des fichiers de preuve...");

  // Remplacer currentCampaignTypeForProof par campaignType
  const [statsData, campaignsData, scanlogsData, blockchainData] = await Promise.all([
    fetch(`${SERVER_URL}/stats`).then(res => res.json()),
    fetch(`${SERVER_URL}/campaigns`).then(res => res.json()),
    fetch(`${SERVER_URL}/scanlogs?type=${encodeURIComponent(campaignType)}`).then(res => res.json()),
    fetch(`${SERVER_URL}/blockchain-scans?scan_type=${encodeURIComponent(campaignType)}`).then(res => res.json())
  ]);
  const campaign = campaignsData.find(c => c.type === campaignType);
  const dateStr = new Date().toLocaleString();

  // 🧠 HTML identique à celui généré dans `generateProof`
  window.generatedHtmlProof = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Vérification Blockchain - QR Tracker</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1000px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #0066cc; }
    .verification-info { background: #f8f9fa; border-left: 5px solid #0066cc; padding: 15px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #f2f2f2; }
    tr:nth-child(even) { background: #f9f9f9; }
    .tx-hash { color: #0066cc; cursor: pointer; text-decoration: underline; }
    .copy-icon { cursor: pointer; margin-left: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Vérification blockchain: Campagne ${campaign.name} (${campaignType})</h1>
    <div class="verification-info">
      <p><strong>Certification blockchain WAX</strong></p>
      <p>Les scans ci-dessous ont été enregistrés de manière immuable sur la blockchain WAX.</p>
      <p>Vous pouvez vérifier l'authenticité de chaque scan en cliquant sur son hash de transaction.</p>
      <p><strong>Dernière mise à jour:</strong> ${dateStr}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>ID</th><th>UUID</th><th>Emplacement</th><th>Date</th><th>Hash transaction</th><th>Bloc</th>
        </tr>
      </thead>
      <tbody>
        ${
          blockchainData.rows?.length > 0
            ? blockchainData.rows.map(scan => {
                const date = new Date(scan.timestamp.utc_seconds * 1000).toLocaleString('fr-FR');
                return `
                <tr>
                  <td>${scan.id}</td>
                  <td>${scan.uuid}</td>
                  <td>${scan.location_id}</td>
                  <td>${date}</td>
                  <td>
                    <span class="tx-hash" onclick="window.open('https://waxblock.io/transaction/${scan.transaction_id}', '_blank')">
                      ${scan.transaction_id.substring(0, 8)}...${scan.transaction_id.slice(-4)}
                    </span>
                    <span class="copy-icon" onclick="navigator.clipboard.writeText('${scan.transaction_id}')">📋</span>
                  </td>
                  <td>${scan.block_num}</td>
                </tr>`;
              }).join("")
            : '<tr><td colspan="6" style="text-align:center;">Aucune donnée disponible</td></tr>'
        }
      </tbody>
    </table>
    <div style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
      Le Règlement eIDAS (UE 910/2014) prône la valeur probante de la preuve numérique scellée... (etc.)
    </div>
  </div>
</body>
</html>`;
}



async function generateFullProofZip(campaignType) {
  const JSZip = window.JSZip;
  const zip = new JSZip();

  const proofBtn = document.getElementById('generate-proof-zip');
  if (proofBtn) {
    proofBtn.classList.add('loading');
  }

  showStatus("Préparation du dossier de preuves...");

  // Générer les fichiers de preuve pour cette campagne spécifique
  try {
    await generateProofFilesForZip(campaignType);
  } catch (err) {
    console.error("Erreur génération des fichiers:", err);
  }

  const proofFolder = zip.folder("Preuve Certifiée");

  // Ajouter les fichiers générés
  if (window.generatedPdfBlob) {
    proofFolder.file("preuve.pdf", window.generatedPdfBlob, { binary: true });
  }
  if (window.generatedJsonStats) {
    proofFolder.file("statistiques.json", JSON.stringify(window.generatedJsonStats, null, 2));
  }
  if (window.generatedCsvStats) {
    proofFolder.file("statistiques.csv", window.generatedCsvStats);
  }
  if (window.generatedHtmlProof) {
    proofFolder.file("preuve.html", window.generatedHtmlProof);
  }

  // 2. Ajouter les fichiers de l'utilisateur
  if (proofFiles.length > 0) {
    const dossierPrincipal = zip.folder("Pièces du dossier");
    const dossierImages = dossierPrincipal.folder("Images");
    const dossierMedias = dossierPrincipal.folder("Médias");
    const dossierDocuments = dossierPrincipal.folder("Documents");
    const dossierAutres = dossierPrincipal.folder("Autres");

    for (const file of proofFiles) {
      const fileData = await file.arrayBuffer();
      const extension = file.name.split('.').pop().toLowerCase();

      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
        dossierImages.file(file.name, fileData);
      } else if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wav', 'mp3', 'ogg'].includes(extension)) {
        dossierMedias.file(file.name, fileData);
      } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'odt', 'ppt', 'pptx'].includes(extension)) {
        dossierDocuments.file(file.name, fileData);
      } else {
        dossierAutres.file(file.name, fileData);
      }
    }
  }

  // 3. Générer et télécharger le ZIP
  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `dossier_preuves_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  if (proofBtn) {
    proofBtn.classList.remove('loading');
  }

  // 4. Afficher le message de succès
  showStatus("✅ Dossier de preuves généré avec succès !");
}



function updateSelectedProofFiles() {
  const list = document.getElementById('selected-proof-files');
  const badge = document.getElementById('proof-file-count');
  const iconContainer = document.getElementById('proof-icons-container');

  if (!list || !badge || !iconContainer) return;

  // Réinitialiser
  list.innerHTML = '';
  iconContainer.innerHTML = '';

  const typeCounts = {
    images: 0,
    medias: 0,
    documents: 0,
    autres: 0
  };

  for (const file of proofFiles) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) {
      typeCounts.images++;
    } else if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wav', 'mp3', 'ogg'].includes(ext)) {
      typeCounts.medias++;
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'odt', 'ppt', 'pptx'].includes(ext)) {
      typeCounts.documents++;
    } else {
      typeCounts.autres++;
    }
  }

  const icons = {
    images: '🖼️',
    medias: '🎥',
    documents: '📄',
    autres: '📁'
  };

  Object.keys(typeCounts).forEach(type => {
    if (typeCounts[type] > 0) {
      const div = document.createElement('div');
      div.className = 'proof-type-icon';
      div.innerHTML = `${icons[type]}<br><small>${typeCounts[type]} fichier(s)</small>`;
      div.onclick = () => showProofTypePopup(type);
      iconContainer.appendChild(div);
    }
  });

  badge.textContent = proofFiles.length;
  badge.style.display = proofFiles.length > 0 ? 'inline-block' : 'none';
}


function showProofTypePopup(type) {
  const overlay = document.createElement('div');
  overlay.className = 'proof-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'proof-modal';

  const typeLabel = {
    images: 'Images',
    medias: 'Médias',
    documents: 'Documents',
    autres: 'Autres'
  };

  modal.innerHTML = `<h3>${typeLabel[type]} sélectionnés</h3>`;
  const list = document.createElement('ul');
  list.className = 'proof-file-list';

  proofFiles.forEach((file, index) => {
    const ext = file.name.split('.').pop().toLowerCase();
    let currentType = 'autres';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) currentType = 'images';
    else if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'wav', 'mp3', 'ogg'].includes(ext)) currentType = 'medias';
    else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'odt', 'ppt', 'pptx'].includes(ext)) currentType = 'documents';

    if (currentType === type) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${file.name}</span>
        <button title="Supprimer" onclick="removeProofFile(${index})">🗑️</button>
      `;
      list.appendChild(li);
    }
  });

  modal.appendChild(list);
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  });

  document.body.appendChild(overlay);
}

function removeProofFile(index) {
  proofFiles.splice(index, 1);
  updateProofFilesDisplay();
}

// Exporter la fonction pour qu'elle soit accessible depuis le HTML
window.removeProofFile = removeProofFile;

// Fonction pour basculer entre les campagnes sans fermer la popup
// Fonction pour basculer entre les campagnes sans fermer la popup
function switchToCampaign(campaignIndex) {
  // Charger les campagnes et les stats depuis le serveur
  Promise.all([
    fetch(`${SERVER_URL}/campaigns`).then(res => res.json()),
    fetch(`${SERVER_URL}/stats`).then(res => res.json())
  ])
  .then(([campaignsData, statsData]) => {
    window.campaigns = campaignsData;
    window.statsData = statsData;
    openCampaignPopup(campaignsData[campaignIndex], campaignIndex, statsData);
  })
  .catch(err => {
    console.error("Erreur lors du chargement des données:", err);
    showError("Impossible de charger les données de la campagne");
  });
}

// Exporter la fonction
window.switchToCampaign = switchToCampaign;


function initProofFileManager() {
  const addFileBtn = document.getElementById('add-proof-files');
  if (addFileBtn) {
    addFileBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);

     input.addEventListener("change", (e) => {
  proofFiles.push(...Array.from(e.target.files));
  updateSelectedProofFiles();
});

      input.click();
    });
  }

  const proofButton = document.getElementById('generate-proof-zip');
  if (proofButton) {
    proofButton.addEventListener('click', async () => {
  try {
    await generateProofFilesForZip();  // Génère le PDF et injecte dans window
    await generateFullProofZip();      // Crée le zip avec ces fichiers
  } catch (err) {
    showError("Erreur lors de la génération du dossier de preuves : " + err.message);
  }
});
  }
}


window.addProofFiles = addProofFiles;
window.updateProofFilesDisplay = updateProofFilesDisplay;

