function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(empty);
}

function buildRatingBreakdown(rating, reviewCount) {
  const total = Math.max(1, reviewCount || 1);
  const five = Math.round(total * Math.min(0.7, rating / 5));
  const four = Math.round(total * 0.17);
  const three = Math.round(total * 0.08);
  const two = Math.round(total * 0.03);
  const one = Math.max(0, total - five - four - three - two);

  return [
    { star: 5, count: five },
    { star: 4, count: four },
    { star: 3, count: three },
    { star: 2, count: two },
    { star: 1, count: one },
  ];
}

function generateOptimizedProfile(business) {
  const photosCount = Array.isArray(business.photos) ? business.photos.length : 0;
  const reviewCount = Number(business.reviewCount || 0);
  const rating = Number(business.rating || 0);
  const hasWebsite = Boolean(business.website);

  let currentScore = 88;
  if (photosCount < 3) currentScore -= 12;
  else if (photosCount < 6) currentScore -= 6;

  if (!hasWebsite) currentScore -= 10;
  if (reviewCount < 20) currentScore -= 12;
  else if (reviewCount < 80) currentScore -= 6;

  if (rating < 4.0) currentScore -= 12;
  else if (rating < 4.4) currentScore -= 6;

  currentScore = Math.max(35, Math.min(89, currentScore));
  const potentialScore = Math.max(75, Math.min(90, currentScore + 14));

  const improvedDescription = `${business.name} se positionne comme une adresse de référence à ${business.city}, avec une expérience client claire, rassurante et orientée conversion locale. La fiche optimisée met en avant les preuves de confiance, les informations essentielles et des appels à l'action visibles pour augmenter les prises de contact.`;

  const services = [
    "Réponse rapide aux demandes clients",
    "Information claire sur les prestations",
    "Suivi qualité et amélioration continue",
  ];

  const faqItems = [
    {
      q: "Comment obtenir une réponse rapide ?",
      a: "Le bouton Appeler et le lien Site web permettent une prise de contact immédiate.",
    },
    {
      q: "Les informations de la fiche sont-elles à jour ?",
      a: "Oui, les données clés sont vérifiées régulièrement pour fiabiliser votre parcours.",
    },
  ];

  const reviewResponses = [
    {
      author: "Client local",
      score: 5,
      text: "Service sérieux et équipe à l'écoute.",
      response: "Merci pour votre confiance, nous restons mobilisés pour maintenir ce niveau de qualité.",
    },
    {
      author: "Visiteur",
      score: 4,
      text: "Bonne expérience globale, informations pratiques.",
      response: "Merci pour votre retour, nous continuons d'optimiser l'expérience à chaque visite.",
    },
  ];

  return {
    improvedDescription,
    services,
    faqItems,
    reviewResponses,
    currentScore,
    potentialScore,
  };
}

function renderPreview(business) {
  const panel = document.getElementById("previewPanel");
  const optimized = generateOptimizedProfile(business);
  const breakdown = buildRatingBreakdown(Number(business.rating || 4.3), Number(business.reviewCount || 0));
  const maxBar = Math.max(...breakdown.map((entry) => entry.count), 1);

  const photos = (Array.isArray(business.photos) ? business.photos : []).slice(0, 6);

  panel.innerHTML = `
    <section class="top-header">
      <h1>${escapeHtml(business.name || "Business")}</h1>
      <p class="sub">${escapeHtml(business.category || "local_business")} · ${escapeHtml(business.city || "Ville")}</p>
      <div class="rating-row">
        <span class="stars">${stars(Number(business.rating || 4.3))}</span>
        <span>${Number(business.rating || 4.3).toFixed(1)} · ${Number(business.reviewCount || 0)} avis</span>
      </div>
      <p class="meta">${escapeHtml(business.address || "Adresse non renseignée")}</p>
      <p class="meta">${escapeHtml(business.phone || "Téléphone non renseigné")}</p>
      <div class="actions">
        <a class="action-btn" href="tel:${escapeHtml(business.phone || "")}">Appeler</a>
        <a class="action-btn" href="https://www.google.com/maps/search/${encodeURIComponent(business.address || "")}" target="_blank">Itinéraire</a>
        <a class="action-btn" href="#">Réserver</a>
        <a class="action-btn" href="${escapeHtml(business.website || "#")}" target="_blank">Site web</a>
      </div>
    </section>

    <section class="tabs">
      <button class="tab active">Présentation</button>
      <button class="tab">Avis</button>
      <button class="tab">Photos</button>
      <button class="tab">Menu</button>
    </section>

    <section class="block">
      <h2>Photos</h2>
      <div class="gallery">
        ${photos.length ? photos.map((src, idx) => `<img src="${escapeHtml(src)}" alt="Photo ${idx + 1}" />`).join("") : "<div class='empty'>Aucune photo disponible.</div>"}
      </div>
    </section>

    <section class="block">
      <h2>Description optimisée</h2>
      <p>${escapeHtml(optimized.improvedDescription)}</p>
    </section>

    <section class="block">
      <h2>Services</h2>
      <div class="list">
        ${optimized.services.map((service) => `<div class="list-item"><span class="check">✓</span>${escapeHtml(service)}</div>`).join("")}
      </div>
    </section>

    <section class="block">
      <h2>FAQ</h2>
      <div class="list">
        ${optimized.faqItems.map((faq) => `<div class="list-item"><strong>${escapeHtml(faq.q)}</strong><p>${escapeHtml(faq.a)}</p></div>`).join("")}
      </div>
    </section>

    <section class="block">
      <h2>Avis et réponses suggérées</h2>
      <div class="list">
        ${optimized.reviewResponses.map((review) => `<div class="list-item"><strong>${escapeHtml(review.author)} · ${"★".repeat(review.score)}</strong><p>${escapeHtml(review.text)}</p><p class="owner-response"><strong>Réponse du propriétaire:</strong> ${escapeHtml(review.response)}</p></div>`).join("")}
      </div>
    </section>

    <section class="block">
      <h2>Répartition des notes</h2>
      <div class="rating-breakdown">
        ${breakdown.map((entry) => `<div class="bar-row"><span>${entry.star}</span><div class="bar"><span style="width:${Math.round((entry.count / maxBar) * 100)}%"></span></div><span>${entry.count}</span></div>`).join("")}
      </div>
    </section>

    <section class="block audit-grid">
      <div class="score-card">
        <p>Current score</p>
        <strong>${optimized.currentScore}</strong>
      </div>
      <div class="score-card optimized">
        <p>Potential optimized score</p>
        <strong>${optimized.potentialScore}</strong>
      </div>
    </section>

    <div class="cta-wrap">
      <button class="primary-btn">Optimiser ma fiche Google</button>
    </div>
  `;
}

function initPreviewPage() {
  const panel = document.getElementById("previewPanel");
  if (!panel) return;

  const raw = localStorage.getItem("selectedBusiness");
  if (!raw) {
    panel.innerHTML = "<div class='empty'>Aucune entreprise sélectionnée. <a href='/'>Retour à la recherche</a></div>";
    return;
  }

  try {
    const business = JSON.parse(raw);
    renderPreview(business);
  } catch (_error) {
    panel.innerHTML = "<div class='empty'>Données invalides. <a href='/'>Retour à la recherche</a></div>";
  }
}

initPreviewPage();
