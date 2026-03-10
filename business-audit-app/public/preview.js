const previewPanel = document.getElementById("previewPanel");

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
  const base = Math.max(1, reviewCount || 1);
  const five = Math.round(base * Math.min(0.72, rating / 5));
  const four = Math.round(base * 0.16);
  const three = Math.round(base * 0.07);
  const two = Math.round(base * 0.03);
  const one = Math.max(0, base - five - four - three - two);
  return [
    { star: 5, count: five },
    { star: 4, count: four },
    { star: 3, count: three },
    { star: 2, count: two },
    { star: 1, count: one }
  ];
}

function optimizeBusinessContent(business) {
  const name = business.name || "Etablissement";
  const category = business.category || "Activite locale";

  const optimizedDescription = `${name} propose une experience ${category.toLowerCase()} de haute qualite, avec un service attentif, une disponibilite claire et une approche orientee satisfaction client. Cette version optimisee met en avant les points forts, facilite la prise de contact et augmente la confiance avant visite.`;

  const services = [
    "Prise de rendez-vous rapide",
    "Accompagnement client personnalise",
    "Support telephonique et suivi"
  ];

  const faqs = [
    { q: "Quels sont vos horaires les plus fiables ?", a: "Les horaires affiches sont verifies chaque semaine pour eviter toute confusion." },
    { q: "Comment reserver ou prendre contact rapidement ?", a: "Le bouton Appeler et le lien Site web permettent une prise de contact immediate." }
  ];

  const reviewResponses = [
    { author: "Client local", score: 5, text: "Tres bonne experience, equipe professionnelle.", response: "Merci pour votre retour, nous sommes ravis de vous avoir accompagne." },
    { author: "Visiteur", score: 4, text: "Service efficace et informations claires.", response: "Merci pour votre confiance, nous continuons d'ameliorer chaque detail." }
  ];

  const currentScore = Math.max(48, Math.round(business.rating * 17 + Math.min(20, business.reviewCount / 12)));
  const optimizedScore = Math.min(100, currentScore + 14);

  return {
    optimizedDescription,
    services,
    faqs,
    reviewResponses,
    currentScore,
    optimizedScore
  };
}

function renderPreview(business) {
  const images = (business.images && business.images.length ? business.images : [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9",
    "https://images.unsplash.com/photo-1551218808-94e220e084d2",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0"
  ]).slice(0, 6);

  const content = optimizeBusinessContent(business);
  const breakdown = buildRatingBreakdown(business.rating || 4.5, business.reviewCount || 0);
  const maxBar = Math.max(...breakdown.map((entry) => entry.count), 1);

  previewPanel.innerHTML = `
    <section class="top-header">
      <h1>${escapeHtml(business.name)}</h1>
      <p class="sub">${escapeHtml(business.category)} - ${escapeHtml(business.city)}</p>
      <div class="rating-row">
        <span class="stars">${stars(business.rating || 4.5)}</span>
        <span>${Number(business.rating || 4.5).toFixed(1)} - ${business.reviewCount || 0} avis</span>
      </div>
      <p class="meta">${escapeHtml(business.address)}</p>
      <p class="meta">${escapeHtml(business.phone || "Telephone non renseigne")}</p>
      <div class="actions">
        <a class="action-btn" href="tel:${escapeHtml(business.phone || "")}">Appeler</a>
        <a class="action-btn" href="https://www.google.com/maps/search/${encodeURIComponent(business.address || "")}" target="_blank">Itineraire</a>
        <a class="action-btn" href="#">Reserver</a>
        <a class="action-btn" href="${escapeHtml(business.website || "#")}" target="_blank">Site web</a>
      </div>
    </section>

    <section class="tabs">
      <button class="tab active">Presentation</button>
      <button class="tab">Avis</button>
      <button class="tab">Photos</button>
      <button class="tab">Menu</button>
    </section>

    <section class="block">
      <h2>Photos</h2>
      <div class="gallery">
        ${images.map((img, index) => `<img src="${escapeHtml(img)}?auto=format&fit=crop&w=900&q=80" alt="Photo ${index + 1}" />`).join("")}
      </div>
    </section>

    <section class="block">
      <h2>Description optimisee</h2>
      <p>${escapeHtml(content.optimizedDescription)}</p>
    </section>

    <section class="block">
      <h2>Services</h2>
      <div class="list">
        ${content.services.map((service) => `<div class="list-item"><span class="check">✓</span>${escapeHtml(service)}</div>`).join("")}
      </div>
    </section>

    <section class="block">
      <h2>FAQ</h2>
      <div class="list">
        ${content.faqs.map((faq) => `<div class="list-item"><strong>${escapeHtml(faq.q)}</strong><p>${escapeHtml(faq.a)}</p></div>`).join("")}
      </div>
    </section>

    <section class="block">
      <h2>Reponses aux avis</h2>
      <div class="list">
        ${content.reviewResponses.map((review) => `<div class="list-item"><strong>${escapeHtml(review.author)} - ${"★".repeat(review.score)}</strong><p>${escapeHtml(review.text)}</p><p class="owner-response"><strong>Reponse du proprietaire:</strong> ${escapeHtml(review.response)}</p></div>`).join("")}
      </div>
    </section>

    <section class="block">
      <h2>Repartition des notes</h2>
      <div class="rating-breakdown">
        ${breakdown.map((entry) => `<div class="bar-row"><span>${entry.star}</span><div class="bar"><span style="width:${Math.round((entry.count / maxBar) * 100)}%"></span></div><span>${entry.count}</span></div>`).join("")}
      </div>
    </section>

    <section class="block audit-grid">
      <div class="score-card">
        <p>Current score</p>
        <strong>${content.currentScore}</strong>
      </div>
      <div class="score-card optimized">
        <p>Potential optimized score</p>
        <strong>${content.optimizedScore}</strong>
      </div>
    </section>

    <div class="cta-wrap">
      <button class="primary-btn">Optimiser ma fiche Google</button>
    </div>
  `;
}

function init() {
  const raw = localStorage.getItem("selectedBusiness");
  if (!raw) {
    previewPanel.innerHTML = "<div class='empty'>Aucune entreprise selectionnee. <a href='/'>Revenir a la recherche</a></div>";
    return;
  }

  try {
    const business = JSON.parse(raw);
    renderPreview(business);
  } catch (_error) {
    previewPanel.innerHTML = "<div class='empty'>Donnees invalides. <a href='/'>Revenir a la recherche</a></div>";
  }
}

init();
