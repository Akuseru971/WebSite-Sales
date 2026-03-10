const form = document.getElementById("searchForm");
const resultsEl = document.getElementById("results");
const resultCountEl = document.getElementById("resultCount");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cardTemplate(business) {
  return `
    <article class="result-card">
      <h3>${escapeHtml(business.name)}</h3>
      <p class="muted">${escapeHtml(business.category)} - ${escapeHtml(business.city)}</p>
      <p>${escapeHtml(business.address)}</p>
      <p><strong>Note:</strong> ${business.rating} (${business.reviewCount} avis)</p>
      <p><strong>Telephone:</strong> ${escapeHtml(business.phone || "Non renseigne")}</p>
      <p><strong>Site web:</strong> ${business.website ? `<a href="${escapeHtml(business.website)}" target="_blank">${escapeHtml(business.website)}</a>` : "Non renseigne"}</p>
      <button class="secondary-btn generate-btn" data-id="${escapeHtml(business.id)}">Generate preview</button>
    </article>
  `;
}

function attachGenerateHandlers(businesses) {
  document.querySelectorAll(".generate-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      const selected = businesses.find((business) => business.id === id);
      if (!selected) return;

      localStorage.setItem("selectedBusiness", JSON.stringify(selected));
      window.location.href = "/preview.html";
    });
  });
}

async function handleSearch(event) {
  event.preventDefault();

  const city = document.getElementById("city").value.trim();
  const category = document.getElementById("category").value.trim();

  resultsEl.innerHTML = "<div class='loading'>Recherche en cours...</div>";

  try {
    const response = await fetch(`/api/businesses/search?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Erreur pendant la recherche");
    }

    const businesses = payload.businesses || [];
    resultCountEl.textContent = `${businesses.length} trouve(s)`;

    if (businesses.length === 0) {
      resultsEl.innerHTML = "<div class='empty'>Aucun resultat pour cette recherche.</div>";
      return;
    }

    resultsEl.innerHTML = businesses.map(cardTemplate).join("");
    attachGenerateHandlers(businesses);
  } catch (error) {
    resultsEl.innerHTML = `<div class='empty'>${escapeHtml(error.message || "Recherche impossible")}</div>`;
    resultCountEl.textContent = "0 trouve";
  }
}

form.addEventListener("submit", handleSearch);
