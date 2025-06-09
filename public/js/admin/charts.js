console.log("Chart disponible?", typeof Chart !== 'undefined');
let ChartLib = window.Chart || window.ChartInstance;

// Fonction pour générer et afficher des graphiques
function renderCharts(campaignType, locationId = null) {
  showStatus("Chargement des données...");
  
  fetch(`${SERVER_URL}/stats`)
    .then(res => res.json())
    .then(stats => {
      if (!stats[campaignType]) {
        showError(`Aucune donnée disponible pour la campagne ${campaignType}`);
        return;
      }

      // Création du modal
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;'
                          + 'background:rgba(0,0,0,0.7);display:flex;'
                          + 'justify-content:center;align-items:center;z-index:1000';

      const modalContent = document.createElement('div');
      modalContent.style.cssText = 'background:white;padding:20px;'
                                 + 'border-radius:10px;width:80%;max-width:800px;'
                                 + 'max-height:80%;overflow:auto';

      // Bouton de fermeture
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.style.cssText = 'float:right;border:none;background:none;'
                                + 'font-size:24px;cursor:pointer;color:#333';
      closeButton.addEventListener('click', () => document.body.removeChild(modal));

      // Titre
      const title = document.createElement('h3');
      title.textContent = locationId
        ? `Statistiques pour ${locationId} (${campaignType})`
        : `Statistiques de la campagne ${campaignType}`;

      // Canvas pour Chart.js
      const chartId = `chart-${Date.now()}`;
      const canvas = document.createElement('canvas');
      canvas.id = chartId;

      modalContent.appendChild(closeButton);
      modalContent.appendChild(title);
      modalContent.appendChild(canvas);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Préparer les données
      let chartData;
      const chartType = 'bar';

      // Hoister qrCodes ici pour la closure
      let qrCodes = [];

      if (locationId) {
        // Vue individuelle (juste total)
        chartData = {
          labels: ['Scans'],
          datasets: [{
            label: 'Nombre de scans',
            data: [stats[campaignType].qrs[locationId] || 0],
           backgroundColor: '#4CAF50'
          }]
        };
      } else {
        // Vue campagne : répartition par QR
        qrCodes = Object.keys(stats[campaignType].qrs);
        const scanCounts = qrCodes.map(qr => stats[campaignType].qrs[qr]);

        chartData = {
          labels: qrCodes,
          datasets: [{
            label: 'Scans par QR code',
            data: scanCounts,
            backgroundColor: currentConfig.modules.statsModule?.colors
                          || ['#4CAF50','#2196F3','#FFC107','#E91E63','#9C27B0']
          }]
        };
      }

      // Options du graphique, avec onClick corrigé
      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          title: {
            display: true,
            text: locationId
              ? `Statistiques pour ${locationId}`
              : 'Répartition des scans par QR code'
          },
          tooltip: {
            callbacks: {
              footer: items => locationId ? '' : 'Cliquez pour détails par date'
            }
          }
        },
        onClick: function(event, elements) {
          // Si on est en vue campagne et qu'un point a été cliqué
          if (!locationId && elements.length > 0) {
            const idx = elements[0].index;
            const clickedQr = qrCodes[idx]; // qrCodes est maintenant en scope
            document.body.removeChild(modal);
            showTimelineStats(campaignType, clickedQr);
          }
        }
      };

      // Vérifier si Chart.js est disponible
      if (!ChartLib) {
        console.error("La bibliothèque Chart.js n'est pas disponible");
        showError("Impossible de générer le graphique : Chart.js n'est pas disponible");
      } else {
        try {
          // Création du chart
          new ChartLib(
            document.getElementById(chartId),
            { type: chartType, data: chartData, options: chartOptions }
          );
          showStatus("Graphique généré");
        } catch (error) {
          console.error("Erreur lors de la création du graphique:", error);
          showError("Erreur lors de la création du graphique: " + error.message);
        }
      }
    })
    .catch(error => {
      console.error("Erreur stats:", error);
      showError("Impossible de charger les statistiques: " + error.message);
    });
}

// Fonction pour afficher les statistiques temporelles d'un QR code
function showTimelineStats(campaignType, locationId) {
  console.log(`Affichage des statistiques temporelles pour ${locationId} (${campaignType})`);
  showStatus("Chargement des données temporelles...");
  
  // Créer un modal pour les statistiques temporelles
  const modal = document.createElement('div');
  modal.className = 'timeline-modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  `;
  
  // Contenu du modal
  const modalContent = document.createElement('div');
  modalContent.className = 'timeline-modal-content';
  modalContent.style.cssText = `
    background: white;
    width: 90%;
    max-width: 900px;
    max-height: 90vh;
    overflow: auto;
    border-radius: 8px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    position: relative;
    padding: 32px;
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
    z-index: 10;
    color: #333;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s ease;
  `;
  closeButton.addEventListener('click', function() {
    document.body.removeChild(modal);
  });
  closeButton.addEventListener('mouseenter', function() {
    this.style.background = '#f0f0f0';
  });
  closeButton.addEventListener('mouseleave', function() {
    this.style.background = 'none';
  });
  
  // Titre
  const title = document.createElement('h2');
  title.textContent = `Statistiques temporelles: ${locationId} (${campaignType})`;
  title.style.marginBottom = '20px';
  title.style.color = '#0066cc';
  
  // Contrôles de filtres de temps
  const filtersContainer = document.createElement('div');
  filtersContainer.className = 'time-filters';
  filtersContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
    padding: 15px;
    background-color: #f5f5f5;
    border-radius: 8px;
  `;
  
  // Boutons pour les différentes vues temporelles
  const timeframeButtons = document.createElement('div');
  timeframeButtons.className = 'timeframe-buttons';
  timeframeButtons.style.cssText = `
    display: flex;
    gap: 5px;
    margin-bottom: 10px;
  `;
  
  // Ajouter les boutons de période
  const periods = [
    { id: 'daily', label: 'Quotidien' },
    { id: 'weekly', label: 'Hebdomadaire' },
    { id: 'monthly', label: 'Mensuel' },
    { id: 'yearly', label: 'Annuel' }
  ];
  
  periods.forEach(period => {
    const button = document.createElement('button');
    button.textContent = period.label;
    button.dataset.period = period.id;
    button.className = 'period-button';
    button.style.cssText = `
      padding: 8px 12px;
      background-color: ${period.id === 'daily' ? '#0066cc' : '#e0e0e0'};
      color: ${period.id === 'daily' ? 'white' : 'black'};
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    
    button.addEventListener('click', function() {
      // Mettre à jour l'apparence des boutons
      document.querySelectorAll('.period-button').forEach(btn => {
        btn.style.backgroundColor = '#e0e0e0';
        btn.style.color = 'black';
      });
      this.style.backgroundColor = '#0066cc';
      this.style.color = 'white';
      
      // Mettre à jour la période active et rafraîchir le graphique
      updateTimelineChart(this.dataset.period);
    });
    
    timeframeButtons.appendChild(button);
  });

  // Sélecteur de type de graphique
const chartTypeContainer = document.createElement('div');
chartTypeContainer.className = 'chart-type-selector';
chartTypeContainer.style.cssText = `
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const chartTypeLabel = document.createElement('label');
chartTypeLabel.textContent = 'Type de graphique:';
chartTypeLabel.style.cssText = `
  font-weight: bold;
  color: #333;
`;

const chartTypeSelect = document.createElement('select');
chartTypeSelect.id = 'timeline-chart-type';
chartTypeSelect.style.cssText = `
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  cursor: pointer;
  font-size: 14px;
`;

// Options de graphiques avec icônes
const chartOptions = [
  { value: 'line', label: '📈 Courbes', icon: '📈' },
  { value: 'bar', label: '📊 Barres', icon: '📊' },
  { value: 'pie', label: '🥧 Camembert', icon: '🥧' },
  { value: 'doughnut', label: '🍩 Donut', icon: '🍩' },
  { value: 'radar', label: '🕸️ Radar', icon: '🕸️' },
  { value: 'polarArea', label: '🎯 Polaire', icon: '🎯' }
];

chartOptions.forEach(option => {
  const optionElement = document.createElement('option');
  optionElement.value = option.value;
  optionElement.textContent = option.label;
  chartTypeSelect.appendChild(optionElement);
});

// Gestionnaire de changement de type
chartTypeSelect.addEventListener('change', function() {
  if (timelineChart) {
    updateTimelineChart(currentPeriod);
  }
});

chartTypeContainer.appendChild(chartTypeLabel);
chartTypeContainer.appendChild(chartTypeSelect);

// Modifier le style du conteneur des boutons
timeframeButtons.style.cssText = `
  display: flex;
  gap: 5px;
  margin-bottom: 10px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

timeframeButtons.appendChild(chartTypeContainer);
  
  // Filtres de dates personnalisés
  const dateFilterContainer = document.createElement('div');
  dateFilterContainer.className = 'date-filter';
  dateFilterContainer.style.cssText = `
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-top: 10px;
  `;
  
  // Label pour le filtre de date
  const dateFilterLabel = document.createElement('span');
  dateFilterLabel.textContent = 'Plage personnalisée: ';
  dateFilterLabel.style.fontWeight = 'bold';
  
  // Input date début - initialiser avec la date d'il y a 30 jours
  const startDateInput = document.createElement('input');
  startDateInput.type = 'date';
  startDateInput.id = 'timeline-start-date';
  startDateInput.style.cssText = `
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
  `;
  
  // Date par défaut: il y a 30 jours
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
  
  // Label entre les dates
  const dateRangeLabel = document.createElement('span');
  dateRangeLabel.textContent = 'au';
  
  // Input date fin - initialiser avec aujourd'hui
  const endDateInput = document.createElement('input');
  endDateInput.type = 'date';
  endDateInput.id = 'timeline-end-date';
  endDateInput.style.cssText = `
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #ccc;
  `;
  endDateInput.value = new Date().toISOString().split('T')[0]; // Aujourd'hui
  
  // Bouton d'application du filtre
  const applyFilterButton = document.createElement('button');
  applyFilterButton.textContent = 'Appliquer';
  applyFilterButton.style.cssText = `
    padding: 8px 12px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  `;
  
  applyFilterButton.addEventListener('click', function() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (startDate && endDate) {
      // Rafraîchir les données avec le filtre de date
      loadTimelineData(campaignType, locationId, startDate, endDate);
    } else {
      showError("Veuillez sélectionner une date de début et de fin");
    }
  });
  
  // Assembler les filtres de date
  dateFilterContainer.appendChild(dateFilterLabel);
  dateFilterContainer.appendChild(startDateInput);
  dateFilterContainer.appendChild(dateRangeLabel);
  dateFilterContainer.appendChild(endDateInput);
  dateFilterContainer.appendChild(applyFilterButton);
  
  // Assembler les contrôles de filtres
  filtersContainer.appendChild(timeframeButtons);
  filtersContainer.appendChild(dateFilterContainer);
  
  // Container pour le graphique
  const chartContainer = document.createElement('div');
  chartContainer.style.cssText = `
    height: 400px;
    position: relative;
    margin-bottom: 20px;
  `;
  
  // Canvas pour le graphique - IMPORTANT: stocké ici pour la closure
  const canvas = document.createElement('canvas');
  const canvasId = `timeline-chart-${Date.now()}`;
  canvas.id = canvasId;
  chartContainer.appendChild(canvas);
  
  // Container pour le tableau de données
  const tableContainer = document.createElement('div');
  tableContainer.style.cssText = `
    margin-top: 30px;
    max-height: 300px;
    overflow-y: auto;
  `;
  
  // Tableau des données
  const dataTable = document.createElement('table');
  dataTable.className = 'timeline-data-table';
  dataTable.style.cssText = `
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    border: 1px solid #ddd;
  `;
  
  // En-tête du tableau
  const tableHeader = document.createElement('thead');
  tableHeader.innerHTML = `
    <tr>
      <th style="padding: 12px; background-color: #f2f2f2; border: 1px solid #ddd; text-align: left;">Période</th>
      <th style="padding: 12px; background-color: #f2f2f2; border: 1px solid #ddd; text-align: center;">Nombre de scans</th>
    </tr>
  `;
  
  // Corps du tableau
  const tableBody = document.createElement('tbody');
  tableBody.id = 'timeline-table-body';
  
  dataTable.appendChild(tableHeader);
  dataTable.appendChild(tableBody);
  tableContainer.appendChild(dataTable);
  
  // Assembler le modal
  modalContent.appendChild(closeButton);
  modalContent.appendChild(title);
  modalContent.appendChild(filtersContainer);
  modalContent.appendChild(chartContainer);
  modalContent.appendChild(tableContainer);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Variables globales pour ce modal
  let timelineChart = null;
  let currentTimelineData = null;
  let currentPeriod = 'daily';
  
  // Fonction pour charger les données
  function loadTimelineData(campaignType, locationId, startDate = null, endDate = null) {
    let url = `${SERVER_URL}/stats/timeline?type=${encodeURIComponent(campaignType)}&location_id=${encodeURIComponent(locationId)}`;
    
    // Ajouter les filtres de date si spécifiés
    if (startDate && endDate) {
      url += `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    }
    
    console.log("Chargement des données temporelles depuis:", url);
    
    fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Erreur serveur: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log("Données temporelles reçues:", data);
        currentTimelineData = data;
        updateTimelineChart(currentPeriod);
      })
      .catch(error => {
        console.error("Erreur lors du chargement des données temporelles:", error);
        showError("Impossible de charger les données temporelles: " + error.message);
      });
  }
  
  // Fonction pour mettre à jour le graphique
 // Fonction pour mettre à jour le graphique
function updateTimelineChart(period) {
  if (!currentTimelineData || !currentTimelineData[period] || currentTimelineData[period].length === 0) {
    console.warn(`Aucune donnée disponible pour la période ${period}`);
    
    // Afficher un message dans le tableau
    const tableBody = document.getElementById('timeline-table-body');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="2" style="text-align: center; padding: 20px;">
            Aucune donnée disponible pour cette période
          </td>
        </tr>
      `;
    }
    
    // Si un graphique existe déjà, le détruire
    if (timelineChart) {
      timelineChart.destroy();
      timelineChart = null;
    }
    
    // Utiliser l'ID du canvas pour le récupérer
    const canvasElement = document.getElementById(canvasId);
    if (canvasElement) {
      const ctx = canvasElement.getContext('2d');
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.fillText('Aucune donnée à afficher', canvasElement.width / 2, canvasElement.height / 2);
    }
    
    return;
  }
  
  // Mettre à jour la période active
  currentPeriod = period;
  
  // Préparer les données pour le graphique
  const labels = currentTimelineData[period].map(item => formatDateLabel(item.date, period));
  const data = currentTimelineData[period].map(item => item.count);
  
  // Détruire l'ancien graphique s'il existe
  if (timelineChart) {
    timelineChart.destroy();
  }
  
  // Récupérer le type de graphique sélectionné
  const selectedChartType = document.getElementById('timeline-chart-type')?.value || 'line';
  
  // Configuration des données selon le type de graphique
  let chartData = {
    labels: labels,
    datasets: [{
      label: 'Nombre de scans',
      data: data,
      backgroundColor: selectedChartType === 'line' ? 'rgba(75, 192, 192, 0.2)' : [
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(231, 233, 237, 0.8)',
        'rgba(255, 182, 193, 0.8)',
        'rgba(176, 196, 222, 0.8)',
        'rgba(255, 218, 185, 0.8)'
      ],
      borderColor: selectedChartType === 'line' ? 'rgba(75, 192, 192, 1)' : [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(231, 233, 237, 1)',
        'rgba(255, 182, 193, 1)',
        'rgba(176, 196, 222, 1)',
        'rgba(255, 218, 185, 1)'
      ],
      borderWidth: selectedChartType === 'line' ? 2 : 1,
      tension: selectedChartType === 'line' ? 0.1 : 0,
      pointRadius: selectedChartType === 'line' ? 5 : 0,
      pointHoverRadius: selectedChartType === 'line' ? 8 : 0
    }]
  };
  
  // Pour les graphiques circulaires, adapter les données
  if (['pie', 'doughnut', 'polarArea'].includes(selectedChartType)) {
    // Limiter aux 10 dernières périodes pour une meilleure lisibilité
    const limit = Math.min(data.length, 10);
    const limitedData = data.slice(-limit);
    const limitedLabels = labels.slice(-limit);
    
    // Calculer les couleurs nécessaires
    const colorCount = limitedData.length;
    const backgroundColors = [];
    const borderColors = [];
    
    for (let i = 0; i < colorCount; i++) {
      const hue = (i * 360 / colorCount) % 360;
      backgroundColors.push(`hsla(${hue}, 70%, 60%, 0.8)`);
      borderColors.push(`hsla(${hue}, 70%, 60%, 1)`);
    }
    
    chartData = {
      labels: limitedLabels,
      datasets: [{
        data: limitedData,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2
      }]
    };
  }
  
  // Configuration des options selon le type
  let chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Évolution des scans - Vue ${getPeriodLabel(period)} (${getChartTypeLabel(selectedChartType)})`
      },
      legend: {
        display: !['line', 'bar'].includes(selectedChartType),
        position: selectedChartType === 'radar' ? 'top' : 'bottom'
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            if (['pie', 'doughnut', 'polarArea'].includes(selectedChartType)) {
              return context[0].label;
            }
            const index = context[0].dataIndex;
            const originalDate = currentTimelineData[period][index].date;
            return formatTooltipTitle(originalDate, period);
          },
          label: function(context) {
            const value = context.parsed.y || context.parsed;
            const percentage = ((value / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
            return `${context.dataset.label || ''}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };
  
  // Options spécifiques pour les graphiques linéaires et en barres
  if (['line', 'bar'].includes(selectedChartType)) {
    chartOptions.scales = {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    };
  }
  
  // Options spécifiques pour le radar
  if (selectedChartType === 'radar') {
    chartOptions.scales = {
      r: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    };
  }
  
  // Options spécifiques pour les graphiques circulaires
  if (['pie', 'doughnut'].includes(selectedChartType)) {
    chartOptions.plugins.datalabels = {
      formatter: (value, ctx) => {
        const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
        const percentage = ((value / sum) * 100).toFixed(1) + '%';
        return percentage;
      },
      color: '#fff'
    };
  }
  
  // Créer le nouveau graphique
  const canvasElement = document.getElementById(canvasId);
  if (!canvasElement) {
    console.error("Canvas non trouvé");
    return;
  }
  
  const ctx = canvasElement.getContext('2d');
  
  // Vérifier si Chart.js est disponible
  if (typeof Chart === 'undefined') {
    console.error("La bibliothèque Chart.js n'est pas disponible");
    showError("Impossible de générer le graphique : Chart.js n'est pas disponible");
    return;
  }
  
  try {
    timelineChart = new Chart(ctx, {
      type: selectedChartType,
      data: chartData,
      options: chartOptions
    });
  } catch (error) {
    console.error("Erreur lors de la création du graphique:", error);
    showError("Erreur lors de la création du graphique: " + error.message);
  }
  
  // Mettre à jour le tableau de données
  updateDataTable(period);
}

// Fonction pour obtenir le label du type de graphique
function getChartTypeLabel(type) {
  switch (type) {
    case 'line': return 'Courbes';
    case 'bar': return 'Barres';
    case 'pie': return 'Camembert';
    case 'doughnut': return 'Donut';
    case 'radar': return 'Radar';
    case 'polarArea': return 'Polaire';
    default: return type;
  }
}
  
  // Fonction pour mettre à jour le tableau de données
  function updateDataTable(period) {
    const tableBody = document.getElementById('timeline-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (currentTimelineData && currentTimelineData[period]) {
      currentTimelineData[period].forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="padding: 12px; border: 1px solid #ddd;">${formatDateLabel(item.date, period)}</td>
          <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${item.count}</td>
        `;
        tableBody.appendChild(row);
      });
    }
  }
  
  // Fonctions d'aide pour formater les dates
  function formatDateLabel(dateStr, period) {
    switch (period) {
      case 'daily':
        // Format YYYY-MM-DD -> JJ/MM/YYYY
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      
      case 'weekly':
        // Format YYYY-WXX -> Semaine XX YYYY
        const [weekYear, weekNum] = dateStr.split('-W');
        return `Sem. ${weekNum} ${weekYear}`;
      
      case 'monthly':
        // Format YYYY-MM -> Mois YYYY
        const [monthYear, monthNum] = dateStr.split('-');
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                           "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        return `${monthNames[parseInt(monthNum) - 1]} ${monthYear}`;
      
      case 'yearly':
        // Format YYYY -> Année YYYY
        return `Année ${dateStr}`;
      
      default:
        return dateStr;
    }
  }
  
  function formatTooltipTitle(dateStr, period) {
    switch (period) {
      case 'daily':
        return `Date: ${formatDateLabel(dateStr, period)}`;
      
      case 'weekly':
        return `Semaine: ${dateStr.split('-W')[1]} de ${dateStr.split('-W')[0]}`;
      
      case 'monthly':
        const [year, month] = dateStr.split('-');
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                           "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        return `Mois: ${monthNames[parseInt(month) - 1]} ${year}`;
      
      case 'yearly':
        return `Année: ${dateStr}`;
      
      default:
        return dateStr;
    }
  }
  
  function getPeriodLabel(period) {
    switch (period) {
      case 'daily': return 'quotidienne';
      case 'weekly': return 'hebdomadaire';
      case 'monthly': return 'mensuelle';
      case 'yearly': return 'annuelle';
      default: return period;
    }
  }

  function getChartTypeLabel(type) {
  switch (type) {
    case 'line': return 'Courbes';
    case 'bar': return 'Barres';
    case 'pie': return 'Camembert';
    case 'doughnut': return 'Donut';
    case 'radar': return 'Radar';
    case 'polarArea': return 'Polaire';
    default: return type;
  }
}
  
  // Charger les données initiales
  loadTimelineData(campaignType, locationId, startDateInput.value, endDateInput.value);
}

// Afficher les statistiques pour une campagne
function fetchStatsForCampaign(type) {
  // Afficher le graphique
  renderCharts(type);
}

// Afficher les statistiques pour un QR code
function fetchStatsForQR(type, location) {
  // Afficher le graphique
  renderCharts(type, location);
}

// Initialisation
document.addEventListener('click', function(e) {
  // Vérifier si c'est un clic sur une ligne de statistique de QR code
  if (e.target && e.target.closest('tr') && e.target.closest('tbody') && e.target.closest('.timeline-data-table')) {
    return;
  }
  
  // Vérifier si c'est un clic sur un QR code dans une liste et non sur un bouton d'action
  if (e.target && e.target.closest('.qr-block') && !e.target.closest('button') && !e.target.closest('a')) {
    const qrBlock = e.target.closest('.qr-block');
    
    // Récupérer les informations du QR code et de la campagne
    const campaignPopup = e.target.closest('.campaign-popup');
    if (campaignPopup) {
      const campaignTitle = campaignPopup.querySelector('.popup-title');
      if (campaignTitle) {
        const titleText = campaignTitle.textContent;
        // Extraire le type de campagne du titre (entre parenthèses)
        const campaignTypeMatch = titleText.match(/\(([^)]+)\)/);
        if (campaignTypeMatch && campaignTypeMatch[1]) {
          const campaignType = campaignTypeMatch[1];
          
          // Récupérer l'emplacement du QR code
          const locationElement = qrBlock.querySelector('.qr-title');
          if (locationElement) {
            const locationId = locationElement.textContent;
            console.log(`Clic détecté sur le lieu ${locationId} de la campagne ${campaignType}`);
            
            // Ouvrir les statistiques temporelles pour ce QR code
            showTimelineStats(campaignType, locationId);
          }
        }
      }
    }
  }
});

// Afficher les statistiques pour un QR code
function fetchStatsForQR(type, location) {
  // Vérifier si le module de stats est actif
  if (currentConfig && currentConfig.modules && currentConfig.modules.statsModule) {
    // Afficher le graphique
    renderCharts(type, location);
  } else {
    // Comportement original: alerte avec juste le total
    console.log(`Tentative de récupération des statistiques pour: Type=${type}, Location=${location}`);
    
    fetch(`${SERVER_URL}/stats`)
      .then(res => res.json())
      .then(stats => {
        console.log("Données de statistiques reçues:", stats);
        
        // Vérifier que nous avons des données pour ce type
        if (!stats[type]) {
          console.warn(`Aucune statistique pour la campagne ${type}`);
          alert(`Aucune statistique disponible pour ce QR code.`);
          return;
        }
        
        // Vérifier si nous avons des données pour ce QR code
        const count = stats[type].qrs[location] || 0;
        console.log(`Nombre de scans pour ${location} dans ${type}: ${count}`);
        
        alert(`📊 Lieu ${location} (campagne ${type}) : ${count} scan(s) unique(s)`);
      })
      .catch(err => {
        console.error("Erreur lors du chargement des statistiques:", err);
        alert("❌ Impossible de charger les statistiques QR : " + err.message);
      });
  }
}

// Initialisation
document.addEventListener('click', function(e) {
  // Vérifier si c'est un clic sur une ligne de statistique de QR code
  if (e.target && e.target.closest('tr') && e.target.closest('tbody') && e.target.closest('.timeline-data-table')) {
    // Laisser le tableau se comporter normalement
    return;
  }
  
  // Vérifier si c'est un clic sur un QR code dans une liste et non sur un bouton d'action
  if (e.target && e.target.closest('.qr-block') && !e.target.closest('button') && !e.target.closest('a')) {
    const qrBlock = e.target.closest('.qr-block');
    
    // Récupérer les informations du QR code et de la campagne
    const campaignPopup = e.target.closest('.campaign-popup');
    if (campaignPopup) {
      const campaignTitle = campaignPopup.querySelector('.popup-title').textContent;
      // Extraire le type de campagne du titre (entre parenthèses)
      const campaignTypeMatch = campaignTitle.match(/\(([^)]+)\)/);
      if (campaignTypeMatch && campaignTypeMatch[1]) {
        const campaignType = campaignTypeMatch[1];
        
        // Récupérer l'emplacement du QR code
        const locationElement = qrBlock.querySelector('.qr-title');
        if (locationElement) {
          const locationId = locationElement.textContent;
          console.log(`Clic détecté sur le lieu ${locationId} de la campagne ${campaignType}`);
          
          // Ouvrir les statistiques temporelles pour ce QR code
          showTimelineStats(campaignType, locationId);
        }
      }
    }
  }
});