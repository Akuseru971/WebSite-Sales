const express = require("express");
const path = require("path");
const { searchBusinesses } = require("./services/businessSearch");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/businesses/search", async (req, res) => {
  try {
    const city = req.query.city || "";
    const category = req.query.category || "";

    const businesses = await searchBusinesses(city, category);

    res.json({
      city,
      category,
      count: businesses.length,
      businesses,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur interne serveur",
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Business audit app running on http://localhost:${PORT}`);
});
