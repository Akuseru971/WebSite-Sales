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

function generateOptimizedProfile(business) {
  const name = business.name || "Etablissement";
  const category = business.category || "activite locale";

  const improvedDescription = `${name} est une reference locale en ${category.toLowerCase()}, avec un positionnement clair, des informations fiables et une experience client soignee. Cette version optimisee met en avant les points differenciants, facilite la prise de contact et renforce la conversion des recherches locales.`;

  const services = [
    "Prise de contact rapide",
    "Accompagnement personnalise",
    "Disponibilite et suivi client"
  ];

  const faqItems = [
    {
      q: "Quels sont les horaires les plus fiables ?",
      a: "Les horaires affiches sont verifies regulierement afin de garantir une information exacte."
    },
    {
      q: "Comment reserver ou obtenir une reponse rapide ?",
      a: "Le bouton Appeler et le lien Site web permettent une prise de contact immediate."
    }
  ];

  const reviewResponses = [
    {
      author: "Client local",
      score: 5,
      text: "Service tres professionnel et accueil impeccable.",
      response: "Merci pour votre confiance. Nous restons mobilises pour offrir une qualite constante."
    },
    {
      author: "Visiteur",
      score: 4,
      text: "Informations claires et intervention efficace.",
      response: "Merci pour ce retour. Nous continuons d'optimiser chaque point de contact."
    }
  ];

  const currentScore = Math.max(45, Math.round((business.rating || 4.2) * 16 + Math.min(20, (business.reviewCount || 0) / 12)));
  const optimizedScore = Math.min(100, currentScore + 14);

  return {
    improvedDescription,
    services,
    faqItems,
    reviewResponses,
    currentScore,
    optimizedScore
  };
}

function renderPreview(business, previewPanel) {
  const images = (Array.isArray(business.images) && business.images.length ? business.images : [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9",
    "https://images.unsplash.com/photo-1551218808-94e220e084d2",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0"
  ]).slice(0, 6);

  const optimized = generateOptimizedProfile(business);
  const breakdown = buildRatingBreakdown(business.rating || 4.5, business.reviewCount || 0);
  const maxBar = Math.max(...breakdown.map((entry) => entry.count), 1);

  previewPanel.innerHTML = `
    <section class="top-header">
      <h1>${escapeHtml(business.name)}</h1>
      <p class="sub">${escapeHtml(business.category)} · ${escapeHtml(business.city)}</p>
      <div class="rating-row">
        <span class="stars">${stars(business.rating || 4.5)}</span>
        <span>${Number(business.rating || 4.5).toFixed(1)} · ${business.reviewCount || 0} avis</span>
      </div>
      <p class="meta">${escapeHtml(business.address || "Adresse non renseignee")}</p>
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
        ${images.map((img, idx) => `<img src="${escapeHtml(img)}?auto=format&fit=crop&w=900&q=80" alt="Photo ${idx + 1}" />`).join("")}
      </div>
    </section>

    <section class="block">
      <h2>Description optimisee</h2>
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
      <h2>Avis et reponses suggerees</h2>
      <div class="list">
        ${optimized.reviewResponses.map((review) => `<div class="list-item"><strong>${escapeHtml(review.author)} · ${"★".repeat(review.score)}</strong><p>${escapeHtml(review.text)}</p><p class="owner-response"><strong>Reponse du proprietaire:</strong> ${escapeHtml(review.response)}</p></div>`).join("")}
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
        <strong>${optimized.currentScore}</strong>
      </div>
      <div class="score-card optimized">
        <p>Potential optimized score</p>
        <strong>${optimized.optimizedScore}</strong>
      </div>
    </section>

    <div class="cta-wrap">
      <button class="primary-btn">Optimiser ma fiche Google</button>
    </div>
  `;
}

function createBusinessCard(business) {
  return `
    <article class="result-card" data-id="${escapeHtml(business.id)}">
      <h3>${escapeHtml(business.name)}</h3>
      <p class="muted">${escapeHtml(business.category)} · ${escapeHtml(business.city)}</p>
      <p>${escapeHtml(business.address)}</p>
      <p><strong>Note:</strong> ${Number(business.rating || 0).toFixed(1)} (${business.reviewCount || 0} avis)</p>
      <p><strong>Telephone:</strong> ${escapeHtml(business.phone || "Non renseigne")}</p>
      <p><strong>Site web:</strong> ${business.website ? `<a href="${escapeHtml(business.website)}" target="_blank">${escapeHtml(business.website)}</a>` : "Non renseigne"}</p>
      <p><strong>Photos:</strong> ${(business.images || []).length}</p>
      <div class="card-actions">
        <button class="secondary-btn analyze-btn" data-id="${escapeHtml(business.id)}">Analyser</button>
        <button class="ghost-btn skip-btn" data-id="${escapeHtml(business.id)}">Passer</button>
      </div>
    </article>
  `;
}

function initSearchPage() {
  const form = document.getElementById("searchForm");
  if (!form) return;

  const resultsEl = document.getElementById("results");
  const resultCountEl = document.getElementById("resultCount");
  const skippedIds = new Set();
  let lastResults = [];

  function attachCardHandlers() {
    document.querySelectorAll(".analyze-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-id");
        const selected = lastResults.find((business) => business.id === id);
        if (!selected) return;

        localStorage.setItem("selectedBusiness", JSON.stringify(selected));
        window.location.href = "/preview.html";
      });
    });

    document.querySelectorAll(".skip-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-id");
        if (!id) return;

        skippedIds.add(id);
        const card = document.querySelector(`.result-card[data-id=\"${id}\"]`);
        if (card) {
          card.classList.add("skipped");
          const badge = document.createElement("div");
          badge.className = "skipped-badge";
          badge.textContent = "Passe";
          card.appendChild(badge);
        }
      });
    });
  }

  async function onSearch(event) {
    event.preventDefault();
    const city = document.getElementById("city").value.trim();
    const type = document.getElementById("businessType").value;

    resultsEl.innerHTML = "<div class='loading'>Recherche en cours...</div>";

    try {
      const response = await fetch(`/api/search?city=${encodeURIComponent(city)}&type=${encodeURIComponent(type)}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Erreur pendant la recherche");
      }

      lastResults = payload.businesses || [];
      resultCountEl.textContent = `${lastResults.length} resultat(s)`;

      if (!lastResults.length) {
        resultsEl.innerHTML = "<div class='empty'>Aucun business trouve pour cette recherche.</div>";
        return;
      }

      resultsEl.innerHTML = lastResults.map(createBusinessCard).join("");
      attachCardHandlers();

      skippedIds.forEach((id) => {
        const card = document.querySelector(`.result-card[data-id=\"${id}\"]`);
        if (card) {
          card.classList.add("skipped");
        }
      });
    } catch (error) {
      resultCountEl.textContent = "0 resultat";
      resultsEl.innerHTML = `<div class='empty'>${escapeHtml(error instanceof Error ? error.message : "Recherche impossible")}</div>`;
    }
  }

  form.addEventListener("submit", onSearch);
}

function initPreviewPage() {
  const previewPanel = document.getElementById("previewPanel");
  if (!previewPanel) return;

  const raw = localStorage.getItem("selectedBusiness");
  if (!raw) {
    previewPanel.innerHTML = "<div class='empty'>Aucune entreprise selectionnee. <a href='/'>Retour a la recherche</a></div>";
    return;
  }

  try {
    const business = JSON.parse(raw);
    renderPreview(business, previewPanel);
  } catch (_error) {
    previewPanel.innerHTML = "<div class='empty'>Donnees invalides. <a href='/'>Retour a la recherche</a></div>";
  }
}

initSearchPage();
initPreviewPage();
