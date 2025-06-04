// Fonction principale pour générer le PDF des statistiques
function generateStatsPDF() {
  showStatus("Génération du PDF en cours...");
  
  // Charger les données statistiques
  fetch(`${SERVER_URL}/stats`)
    .then(res => res.json())
    .then(statsData => {
      // Charger les données des campagnes pour les noms complets
      fetch(`${SERVER_URL}/campaigns`)
        .then(res => res.json())
        .then(campaignsData => {
          createStatsPDF(statsData, campaignsData);
        })
        .catch(err => {
          showError("Erreur lors du chargement des campagnes: " + err.message);
        });
    })
    .catch(err => {
      showError("Erreur lors du chargement des statistiques: " + err.message);
    });
}

// Création et téléchargement du PDF
function createStatsPDF(statsData, campaignsData) {
  const { jsPDF } = window.jspdf;
  
  // Créer un nouveau document PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Ajouter un titre
  const title = "Rapport de Statistiques - QR Tracker";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, 105, 15, { align: 'center' });
  
  // Ajouter la date d'exportation
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-FR', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Exporté le ${dateStr}`, 105, 25, { align: 'center' });
  
  // Position verticale courante pour les éléments suivants
  let yPos = 35;
  
  // Parcourir toutes les campagnes
  let campaignCount = 0;
  
  // On tri les campagnes par ordre alphabétique
  const orderedCampaigns = Object.keys(statsData).sort();
  
  for (const campaignType of orderedCampaigns) {
    // Vérifier si nous avons des statistiques pour cette campagne
    if (!statsData[campaignType]) continue;
    
    // Trouver le nom complet de la campagne
    const campaign = campaignsData.find(c => c.type === campaignType);
    const campaignName = campaign ? campaign.name : campaignType;
    
    // Ajouter un saut de page si nécessaire (sauf pour la première campagne)
    if (campaignCount > 0 && yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    // Titre de la campagne
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204); // Bleu
    doc.text(`Campagne: ${campaignName} (${campaignType})`, 15, yPos);
    yPos += 10;
    
    // Informations de la campagne
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0); // Noir
    
    const totalScans = statsData[campaignType].total || 0;
    doc.text(`Nombre total de scans uniques: ${totalScans}`, 15, yPos);
    yPos += 7;
    
    if (campaign) {
      doc.text(`Description: ${campaign.description || 'Non spécifiée'}`, 15, yPos);
      yPos += 7;
      
      // Date de création
      if (campaign.created_at) {
        doc.text(`Date de création: ${campaign.created_at}`, 15, yPos);
        yPos += 7;
      }
    }
    
    // Vérifier si cette campagne a des QR codes
    const qrCodes = Object.keys(statsData[campaignType].qrs || {});
    
    if (qrCodes.length > 0) {
      yPos += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Répartition des scans par QR code:", 15, yPos);
      yPos += 7;
      
         // Créer un tableau des statistiques par QR code (toutes valeurs en chaînes)
const tableData = qrCodes.map(qrCode => {
  // 1) Nombre de scans pour ce QR
  const scanCount = statsData[campaignType].qrs[qrCode] || 0;
  const scanCountStr = scanCount.toString();

  // 2) Pourcentage sur le total
  const percentage = totalScans > 0
    ? ((scanCount / totalScans) * 100).toFixed(1) + '%'
    : '0%';

  // 3) Récupérer max_scans_per_uuid depuis campaignsData
  const campaignObj = campaignsData.find(c => c.type === campaignType);
  const qrObj = campaignObj?.qrs.find(q =>
    (q.location_id === qrCode) || (q.location === qrCode)
  );
  let maxScansStr = "1";
if (qrObj?.mode === "presence") {
  const p = qrObj.presence || {};
  maxScansStr = `Présence: ${p.nombre_personnes || 1}\n${p.date_debut || ''} ${p.heure_debut || ''} → ${p.date_fin || ''} ${p.heure_fin || ''}`;
} else {
  maxScansStr = (qrObj?.max_scans_per_uuid || 1).toString();
}


  // 4) Retourner un tableau de chaînes, dans l'ordre des en‑têtes
  return [maxScansStr, qrCode, scanCountStr, percentage];
});


      
      // Trier par nombre de scans décroissant
      tableData.sort((a, b) => b[1] - a[1]);
      
         // Entêtes du tableau (4 colonnes : max_scans, emplacement, nb scans, %)
    const headers = [
      { content: 'Scans Max/UUID', styles: { halign: 'center', fillColor: [220,230,240] } },
      { content: 'Emplacement',     styles: { halign: 'left',   fillColor: [220,230,240] } },
      { content: 'Nb Scans',        styles: { halign: 'center', fillColor: [220,230,240] } },
      { content: '% du Total',      styles: { halign: 'center', fillColor: [220,230,240] } }
    ];

      
      // Utiliser AutoTable pour créer un tableau élégant
      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: yPos,
        margin: {left: 15},
        styles: {
          fontSize: 10
        },
        columnStyles: {
          0: {cellWidth: 80},
          1: {cellWidth: 40, halign: 'center'},
          2: {cellWidth: 40, halign: 'center'}
        },
        didDrawPage: (data) => {
  // Ajouter un pied de page avec la numérotation
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    `QR Tracker - Page ${doc.getNumberOfPages()}`, 
    doc.internal.pageSize.width / 2, 
    doc.internal.pageSize.height - 10, 
    { align: 'center' }
  );
  
  // Ajouter le texte légal en bas de page
  doc.setFontSize(6);
  const legalText = "Le Règlement eIDAS (UE 910/2014) prône la valeur probante de la preuve numérique scellée, recommandant des technologies comme la blockchain pour l'horodatage, la non-répudiation, et l'auditabilité : \"Les technologies de registre distribué permettent de garantir l'intégrité et la traçabilité des preuves, conformément aux attentes d'opposabilité légale.\" (Source : eIDAS - Commission européenne). Ce document permet à son porteur de pouvoir produire une preuve de réalisation infalsifiable, opposable en cas de contrôle. Elle est archivée indéfiniment sur la blockchain.";
  
  doc.text(
    legalText,
    105,
    doc.internal.pageSize.height - 5,
    { align: 'center', maxWidth: 180 }
  );
}
      });
      
      // Mettre à jour la position Y après le tableau
      yPos = doc.lastAutoTable.finalY + 15;
      const topQRs = tableData.slice(0, 5); // Top 5 QR codes triés

      // Si nous avons suffisamment d'espace, ajouter un graphique
if (yPos < 200 && qrCodes.length > 0) {
  // … calcul de topQRs, graphWidth, graphHeight, barHeight …
  const graphWidth  = 180;
  const graphHeight = 70;
  const barHeight   = graphHeight / topQRs.length;

  // Calcul du maximum pour éviter zero-division
  const maxValue = Math.max(...topQRs.map(qr => qr[1]));

  if (maxValue > 0) {
    // Titre du graphique
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Top des QR codes scannés:", 15, yPos);
    yPos += 10;

    // Dessiner les barres
    for (let i = 0; i < topQRs.length; i++) {
      const qrLocation = topQRs[i][0];
      const scanCount  = topQRs[i][1];
      // barWidth sécurisé
      const barWidth = (scanCount / maxValue) * 120;

      // Nom du QR code (tronqué si trop long)
      const displayName = qrLocation.length > 20 
        ? qrLocation.substring(0, 18) + "..." 
        : qrLocation;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(displayName, 15, yPos + (i * barHeight) + 4);

      // Barre du graphique
      doc.setDrawColor(0);
      doc.setFillColor(66, 133, 244);
      doc.rect(
        60,
        yPos + (i * barHeight),
        barWidth,
        barHeight - 2,
        'F'
      );

      // Valeur
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(
        scanCount.toString(),
        60 + barWidth + 3,
        yPos + (i * barHeight) + 4
      );
    }

    yPos += graphHeight + 15;
  }
}

    } else {
      doc.text("Aucun QR code associé à cette campagne.", 15, yPos);
      yPos += 10;
    }
    
    // Augmenter le compteur de campagnes
    campaignCount++;
  }
  
  // Titre de résumé global
  if (campaignCount > 1) {
    // Ajouter une nouvelle page pour le résumé
    doc.addPage();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 102, 204); // Bleu
    doc.text("Résumé Global", 105, 20, { align: 'center' });
    
    // Créer un tableau de résumé de toutes les campagnes
    const summaryData = orderedCampaigns.map(campaignType => {
      const campaign = campaignsData.find(c => c.type === campaignType);
      const campaignName = campaign ? campaign.name : campaignType;
      const totalScans = statsData[campaignType].total || 0;
      const qrCount = Object.keys(statsData[campaignType].qrs || {}).length;
      return [campaignName, campaignType, totalScans, qrCount];
    });
    
    // Trier par nombre total de scans décroissant
    summaryData.sort((a, b) => b[2] - a[2]);
    
    // Entêtes du tableau de résumé
    const summaryHeaders = [
      {content: 'Campagne', styles: {halign: 'left', fillColor: [220, 230, 240]}},
      {content: 'Type', styles: {halign: 'left', fillColor: [220, 230, 240]}},
      {content: 'Total Scans', styles: {halign: 'center', fillColor: [220, 230, 240]}},
      {content: 'Nb QR codes', styles: {halign: 'center', fillColor: [220, 230, 240]}}
    ];
    
    // Utiliser AutoTable pour le résumé
    doc.autoTable({
      head: [summaryHeaders],
      body: summaryData,
      startY: 30,
      margin: {left: 15},
      styles: {
        fontSize: 10
      },
      columnStyles: {
  0: { cellWidth: 70 }, // au lieu de 80
  1: { cellWidth: 35, halign: 'center' },
  2: { cellWidth: 35, halign: 'center' }
}

    });
  }
  
  // Si aucune campagne n'a été trouvée
  if (campaignCount === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(12);
    doc.text("Aucune donnée statistique disponible.", 105, 50, { align: 'center' });
  }
  
  // Télécharger le PDF
  const fileName = `rapport-qrtracker-${today.toISOString().slice(0,10)}.pdf`;
  doc.save(fileName);
  
  showStatus(`PDF généré et téléchargé: ${fileName}`);
  
  
}

// Fonction pour créer un Blob PDF avec les statistiques
function createStatsPDFBlob(statsData, campaignsData, htmlFilename, campaignType) {
  return new Promise((resolve, reject) => {
    try {
      const { jsPDF } = window.jspdf;
      
      // Créer un nouveau document PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
	  
	   // Définir le texte légal une seule fois au début de la fonction
      const legalText = "Le Règlement eIDAS (UE 910/2014) prône la valeur probante de la preuve numérique scellée, recommandant des technologies comme la blockchain pour l'horodatage, la non-répudiation, et l'auditabilité : \"Les technologies de registre distribué permettent de garantir l'intégrité et la traçabilité des preuves, conformément aux attentes d'opposabilité légale.\" (Source : eIDAS - Commission européenne). Ce document permet à son porteur de pouvoir produire une preuve de réalisation infalsifiable, opposable en cas de contrôle. Elle est archivée indéfiniment sur la blockchain.";
      
      
      // Ajouter un titre
      const title = "Rapport de Statistiques - QR Tracker";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(title, 105, 15, { align: 'center' });
      
      // Ajouter la date d'exportation
      const today = new Date();
      const dateStr = today.toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Exporté le ${dateStr}`, 105, 25, { align: 'center' });
      
      // Position verticale courante pour les éléments suivants
      let yPos = 35;
      
      // Parcourir toutes les campagnes
      let campaignCount = 0;
      
      // On tri les campagnes par ordre alphabétique
      const orderedCampaigns = Object.keys(statsData).sort();
      
      for (const campaignType of orderedCampaigns) {
        // Vérifier si nous avons des statistiques pour cette campagne
        if (!statsData[campaignType]) continue;
        
        // Trouver le nom complet de la campagne
        const campaign = campaignsData.find(c => c.type === campaignType);
        const campaignName = campaign ? campaign.name : campaignType;
        
        // Ajouter un saut de page si nécessaire (sauf pour la première campagne)
        if (campaignCount > 0 && yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        // Titre de la campagne
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(0, 102, 204); // Bleu
        doc.text(`Campagne: ${campaignName} (${campaignType})`, 15, yPos);
        yPos += 10;
        
        // Informations de la campagne
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0); // Noir
        
        const totalScans = statsData[campaignType].total || 0;
        doc.text(`Nombre total de scans uniques: ${totalScans}`, 15, yPos);
        yPos += 7;
        
        if (campaign) {
          doc.text(`Description: ${campaign.description || 'Non spécifiée'}`, 15, yPos);
          yPos += 7;
          
          // Date de création
          if (campaign.created_at) {
            doc.text(`Date de création: ${campaign.created_at}`, 15, yPos);
            yPos += 7;
          }
        }
        
        // Vérifier si cette campagne a des QR codes
        const qrCodes = Object.keys(statsData[campaignType].qrs || {});
        
        if (qrCodes.length > 0) {
          yPos += 5;
          doc.setFont("helvetica", "bold");
          doc.text("Répartition des scans par QR code:", 15, yPos);
          yPos += 7;
          
          // Créer un tableau des statistiques par QR code (toutes valeurs en chaînes)
          const tableData = qrCodes.map(qrCode => {
            // 1) Nombre de scans pour ce QR
            const scanCount = statsData[campaignType].qrs[qrCode] || 0;
            const scanCountStr = scanCount.toString();

            // 2) Pourcentage sur le total
            const percentage = totalScans > 0
              ? ((scanCount / totalScans) * 100).toFixed(1) + '%'
              : '0%';

            // 3) Récupérer max_scans_per_uuid depuis campaignsData
            const campaignObj = campaignsData.find(c => c.type === campaignType);
            const qrObj = campaignObj?.qrs.find(q =>
              (q.location_id === qrCode) || (q.location === qrCode)
            );
            let maxScansStr = "1";
            if (qrObj?.mode === "presence") {
              const p = qrObj.presence || {};
              maxScansStr = `Présence: ${p.nombre_personnes || 1}\n${p.date_debut || ''} ${p.heure_debut || ''} → ${p.date_fin || ''} ${p.heure_fin || ''}`;
            } else {
              maxScansStr = (qrObj?.max_scans_per_uuid || 1).toString();
            }

            // 4) Retourner un tableau de chaînes, dans l'ordre des en‑têtes
            return [maxScansStr, qrCode, scanCountStr, percentage];
          });
          
          // Trier par nombre de scans décroissant
          tableData.sort((a, b) => b[1] - a[1]);
          
          // Entêtes du tableau (4 colonnes : max_scans, emplacement, nb scans, %)
          const headers = [
            { content: 'Scans Max/UUID', styles: { halign: 'center', fillColor: [220,230,240] } },
            { content: 'Emplacement',     styles: { halign: 'left',   fillColor: [220,230,240] } },
            { content: 'Nb Scans',        styles: { halign: 'center', fillColor: [220,230,240] } },
            { content: '% du Total',      styles: { halign: 'center', fillColor: [220,230,240] } }
          ];
          
          // Utiliser AutoTable pour créer un tableau élégant
          doc.autoTable({
            head: [headers],
            body: tableData,
            startY: yPos,
            margin: {left: 15},
            styles: {
              fontSize: 10
            },
            columnStyles: {
              0: {cellWidth: 80},
              1: {cellWidth: 40, halign: 'center'},
              2: {cellWidth: 40, halign: 'center'}
            },
             didDrawPage: (data) => {
        // Ajouter un pied de page avec la numérotation
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text(
          `QR Tracker - Page ${doc.getNumberOfPages()}`, 
          doc.internal.pageSize.width / 2, 
          doc.internal.pageSize.height - 10, 
          { align: 'center' }
        );
        
        // Ajouter le texte légal en bas de page
        doc.setFontSize(6);
        doc.text(
          legalText,
          105,
          doc.internal.pageSize.height - 5,
          { align: 'center', maxWidth: 180 }
        );
      }
          });
          
          // Mettre à jour la position Y après le tableau
          yPos = doc.lastAutoTable.finalY + 15;
          
        // Ajouter une section blockchain
doc.setFont("helvetica", "bold");
doc.setFontSize(12);
doc.setTextColor(0, 102, 204); // Bleu
doc.text("Vérification blockchain:", 15, yPos);
yPos += 8;

doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(0, 0, 0); // Noir
doc.text("Les données de cette campagne sont enregistrées sur la blockchain WAX.", 15, yPos);
yPos += 6;

doc.text("Pour vérifier les enregistrements, cliquez sur le lien ci-dessous:", 15, yPos);
yPos += 6;

doc.setTextColor(0, 0, 255); // Bleu (lien)
// Lien vers le fichier HTML local
doc.textWithLink("Ouvrir l'interface de vérification blockchain", 15, yPos, { 
  url: htmlFilename 
});
yPos += 6;

doc.setTextColor(0, 0, 0); // Noir
doc.setFontSize(8);
doc.text("Note: Assurez-vous d'avoir extrait tous les fichiers du ZIP dans un même dossier pour que ce lien fonctionne.", 15, yPos);
yPos += 10;
          
          const topQRs = tableData.slice(0, 5); // Top 5 QR codes triés
          
          // Si nous avons suffisamment d'espace, ajouter un graphique
          if (yPos < 200 && qrCodes.length > 0) {
            // … calcul de topQRs, graphWidth, graphHeight, barHeight …
            const graphWidth  = 180;
            const graphHeight = 70;
            const barHeight   = graphHeight / topQRs.length;
            
            // Calcul du maximum pour éviter zero-division
            const maxValue = Math.max(...topQRs.map(qr => parseInt(qr[2]) || 0));
            
            if (maxValue > 0) {
              // Titre du graphique
              doc.setFont("helvetica", "bold");
              doc.setFontSize(12);
              doc.text("Top des QR codes scannés:", 15, yPos);
              yPos += 10;
              
              // Dessiner les barres
              for (let i = 0; i < topQRs.length; i++) {
                const qrLocation = topQRs[i][1];
                const scanCount  = parseInt(topQRs[i][2]) || 0;
                // barWidth sécurisé
                const barWidth = (scanCount / maxValue) * 120;
                
                // Nom du QR code (tronqué si trop long)
                const displayName = qrLocation.length > 20 
                  ? qrLocation.substring(0, 18) + "..." 
                  : qrLocation;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.text(displayName, 15, yPos + (i * barHeight) + 4);
                
                // Barre du graphique
                doc.setDrawColor(0);
                doc.setFillColor(66, 133, 244);
                doc.rect(
                  60,
                  yPos + (i * barHeight),
                  barWidth,
                  barHeight - 2,
                  'F'
                );
                
                // Valeur
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(0, 0, 0);
                doc.text(
                  scanCount.toString(),
                  60 + barWidth + 3,
                  yPos + (i * barHeight) + 4
                );
              }
              
              yPos += graphHeight + 15;
            }
          }
        } else {
          doc.text("Aucun QR code associé à cette campagne.", 15, yPos);
          yPos += 10;
        }
        
        // Augmenter le compteur de campagnes
        campaignCount++;
      }
	  
	  // Appliquer le texte légal à toutes les pages
const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6);
        doc.text(
          legalText,
          105,
          doc.internal.pageSize.height - 5,
          { align: 'center', maxWidth: 180 }
        );
      }
        // Retourner le PDF sous forme de Blob
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    } catch (err) {
      console.error("Erreur lors de la création du PDF:", err);
      reject(err);
    }
  });
}

// Fonction pour générer un PDF pour une campagne spécifique
function generateStatsPDFForCampaign(campaignType) {
  showStatus(`Génération du PDF pour la campagne "${campaignType}"...`);
  
  // Charger les données statistiques
  fetch(`${SERVER_URL}/stats`)
    .then(res => res.json())
    .then(statsData => {
      // S'assurer que les données de cette campagne existent
      if (!statsData[campaignType]) {
        showError(`Aucune donnée disponible pour la campagne ${campaignType}`);
        return;
      }
      
      // Créer un nouvel objet de stats avec uniquement cette campagne
      const filteredStatsData = {
        [campaignType]: statsData[campaignType]
      };
      
      // Charger les données des campagnes pour les noms complets
      fetch(`${SERVER_URL}/campaigns`)
        .then(res => res.json())
        .then(campaignsData => {
          // Filtrer pour avoir seulement la campagne demandée
          const filteredCampaignsData = campaignsData.filter(c => c.type === campaignType);
          
          // Créer le PDF avec les données filtrées
          createStatsPDF(filteredStatsData, filteredCampaignsData);
        })
        .catch(err => {
          showError("Erreur lors du chargement des campagnes: " + err.message);
        });
    })
    .catch(err => {
      showError("Erreur lors du chargement des statistiques: " + err.message);
    });
}

// Fonction pour générer un PDF pour un QR code spécifique
function generateStatsPDFForQR(campaignType, locationId) {
  showStatus(`Génération du PDF pour le QR code "${locationId}" de la campagne "${campaignType}"...`);
  
  // Charger les données statistiques
  fetch(`${SERVER_URL}/stats`)
    .then(res => res.json())
    .then(statsData => {
      // S'assurer que les données de cette campagne existent
      if (!statsData[campaignType]) {
        showError(`Aucune donnée disponible pour la campagne ${campaignType}`);
        return;
      }
      
      // Créer un nouvel objet de stats avec uniquement ce QR code
      const filteredQrStats = {};
      if (statsData[campaignType].qrs && statsData[campaignType].qrs[locationId] !== undefined) {
        filteredQrStats[locationId] = statsData[campaignType].qrs[locationId];
      } else {
        showError(`Aucune donnée disponible pour le QR code ${locationId}`);
        return;
      }
      
      const filteredStatsData = {
        [campaignType]: {
          total: statsData[campaignType].qrs[locationId], // Le total sera le nombre de scans de ce QR
          qrs: filteredQrStats
        }
      };
      
      // Charger les données des campagnes pour les noms complets
      fetch(`${SERVER_URL}/campaigns`)
        .then(res => res.json())
        .then(campaignsData => {
          // Filtrer pour avoir seulement la campagne demandée
          const filteredCampaignsData = campaignsData.filter(c => c.type === campaignType);
          
          // Ajouter des informations supplémentaires sur le QR code
          if (filteredCampaignsData.length > 0) {
            const campaign = filteredCampaignsData[0];
            if (campaign.qrs) {
              // Trouver le QR code spécifique pour obtenir ses métadonnées
              const qrInfo = campaign.qrs.find(q => q.location_id === locationId || q.location === locationId);
              if (qrInfo) {
                // Ajouter des informations spécifiques au QR code
                createStatsPDF(filteredStatsData, filteredCampaignsData);
                return;
              }
            }
          }
          
          // Si nous n'avons pas trouvé d'informations spécifiques, générer un PDF standard
          createStatsPDF(filteredStatsData, filteredCampaignsData);
        })
        .catch(err => {
          showError("Erreur lors du chargement des campagnes: " + err.message);
        });
    })
    .catch(err => {
      showError("Erreur lors du chargement des statistiques: " + err.message);
    });
}

function generateProofFilesForZip() {
  showStatus("Génération des fichiers de preuve (ZIP)...");

  return Promise.all([
    fetch(`${SERVER_URL}/stats`).then(res => res.json()),
    fetch(`${SERVER_URL}/campaigns`).then(res => res.json())
  ])
  .then(([statsData, campaignsData]) => {
    return createStatsPDFBlob(statsData, campaignsData, "preuve.html").then(pdfBlob => {
      const jsonData = JSON.stringify(statsData, null, 2);

      // Création CSV
      const csvRows = ["Campagne,QR,Scans"];
      for (const [campaignType, campaignStats] of Object.entries(statsData)) {
        const qrs = campaignStats.qrs || {};
        for (const [qr, count] of Object.entries(qrs)) {
          csvRows.push(`${campaignType},${qr},${count}`);
        }
      }
      const csvText = csvRows.join("\n");

      // HTML de preuve
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Preuve Blockchain</title></head>
        <body>
          <h1>Vérification Blockchain</h1>
          <p>Données enregistrées sur la blockchain WAX.</p>
          <p>Date : ${new Date().toLocaleString()}</p>
        </body>
        </html>
      `;

      // Exposer les fichiers dans window pour usage local
      window.generatedPdfBlob = pdfBlob;
      window.generatedJsonStats = JSON.parse(jsonData);
      window.generatedCsvStats = csvText;
      window.generatedHtmlProof = htmlContent;

      showStatus("📦 Fichiers de preuve générés localement !");
    });
  })
  .catch(err => {
    console.error("Erreur génération fichiers de preuve :", err);
    showError("Erreur lors de la génération des fichiers de preuve : " + err.message);
  });
}

// Exposer createStatsPDFBlob au reste de l'application
window.createStatsPDFBlob = createStatsPDFBlob;
