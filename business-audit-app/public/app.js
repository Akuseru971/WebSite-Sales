function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function businessCardTemplate(business) {
  return `
    <article class="result-card" data-id="${escapeHtml(business.id)}">
      <div class="card-head">
        ${business.photoUrl ? `<img class="thumb" src="${escapeHtml(business.photoUrl)}" alt="${escapeHtml(business.name)}" />` : "<div class='thumb thumb-empty'>Photo indisponible</div>"}
        <div>
          <h3>${escapeHtml(business.name)}</h3>
          <p class="muted">${escapeHtml(business.category)} · ${escapeHtml(business.city)}</p>
        </div>
      </div>
      <p>${escapeHtml(business.address || "Adresse non disponible")}</p>
      <p><strong>Note:</strong> ${Number(business.rating || 0).toFixed(1)} (${business.reviewCount || 0} avis)</p>
      <p><strong>Téléphone:</strong> ${escapeHtml(business.phone || "Non renseigné")}</p>
      <p><strong>Site web:</strong> ${business.website ? `<a href="${escapeHtml(business.website)}" target="_blank">${escapeHtml(business.website)}</a>` : "Non renseigné"}</p>
      <p><strong>Photos:</strong> ${Array.isArray(business.photos) ? business.photos.length : 0}</p>
      <div class="card-actions">
        <button class="secondary-btn analyze-btn" data-id="${escapeHtml(business.id)}">Analyser</button>
        <button class="ghost-btn skip-btn" data-id="${escapeHtml(business.id)}">Passer</button>
      </div>
    </article>
  `;
}

function setMessage(target, text, type) {
  target.textContent = text;
  target.className = `feedback ${type}`;
}

async function parseApiResponse(response) {
  const raw = await response.text();
  let payload = null;

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch (_error) {
    payload = null;
  }

  if (!response.ok) {
    if (payload && payload.error) {
      throw new Error(payload.error);
    }

    if (raw && raw.includes("<!doctype html>")) {
      throw new Error("Endpoint API introuvable. Lance business-audit-app avec `npm start` puis ouvre http://localhost:3001.");
    }

    throw new Error(`Erreur HTTP ${response.status}`);
  }

  if (!payload) {
    throw new Error("Réponse serveur invalide.");
  }

  return payload;
}

function initSearchPage() {
  const form = document.getElementById("searchForm");
  if (!form) return;

  const resultsEl = document.getElementById("results");
  const resultCountEl = document.getElementById("resultCount");
  const feedbackEl = document.getElementById("searchFeedback");
  const skippedIds = new Set();
  let lastResults = [];
  let lastCity = "";

  function applySkippedVisualState() {
    skippedIds.forEach((id) => {
      const card = document.querySelector(`.result-card[data-id=\"${id}\"]`);
      if (!card) return;
      card.classList.add("skipped");
      if (!card.querySelector(".skipped-badge")) {
        const badge = document.createElement("div");
        badge.className = "skipped-badge";
        badge.textContent = "Passé";
        card.appendChild(badge);
      }
    });
  }

  async function onAnalyze(id) {
    const selected = lastResults.find((business) => business.id === id);
    if (!selected) return;

    try {
      const response = await fetch(`/api/business/${encodeURIComponent(id)}?city=${encodeURIComponent(lastCity || selected.city || "")}`);
      const payload = await parseApiResponse(response);

      localStorage.setItem("selectedBusiness", JSON.stringify(payload.business || selected));
      window.location.href = "/preview.html";
    } catch (error) {
      setMessage(feedbackEl, error instanceof Error ? error.message : "Erreur pendant l'analyse.", "error");
    }
  }

  function attachHandlers() {
    document.querySelectorAll(".analyze-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-id");
        if (!id) return;
        onAnalyze(id);
      });
    });

    document.querySelectorAll(".skip-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-id");
        if (!id) return;
        skippedIds.add(id);
        applySkippedVisualState();
      });
    });
  }

  async function onSearch(event) {
    event.preventDefault();
    const city = document.getElementById("city").value.trim();
    const type = document.getElementById("businessType").value;

    if (!city) {
      setMessage(feedbackEl, "Merci de saisir une ville avant la recherche.", "error");
      resultsEl.innerHTML = "";
      resultCountEl.textContent = "0 résultat";
      return;
    }

    lastCity = city;
    setMessage(feedbackEl, "Recherche en cours...", "info");
    resultsEl.innerHTML = "<div class='loading'>Chargement des établissements réels...</div>";

    try {
      const response = await fetch(`/api/search?city=${encodeURIComponent(city)}&type=${encodeURIComponent(type)}`);
      const payload = await parseApiResponse(response);

      lastResults = payload.businesses || [];
      resultCountEl.textContent = `${lastResults.length} résultat(s)`;

      if (lastResults.length === 0) {
        setMessage(feedbackEl, "Aucun résultat trouvé pour cette recherche.", "warn");
        resultsEl.innerHTML = "<div class='empty'>Aucun établissement trouvé pour les critères saisis.</div>";
        return;
      }

      setMessage(feedbackEl, `${lastResults.length} établissement(s) chargé(s).`, "success");
      resultsEl.innerHTML = lastResults.map(businessCardTemplate).join("");
      attachHandlers();
      applySkippedVisualState();
    } catch (error) {
      setMessage(feedbackEl, error instanceof Error ? error.message : "Recherche impossible.", "error");
      resultCountEl.textContent = "0 résultat";
      resultsEl.innerHTML = "<div class='empty'>Impossible de récupérer les résultats Google Places.</div>";
    }
  }

  form.addEventListener("submit", onSearch);
}

initSearchPage();
