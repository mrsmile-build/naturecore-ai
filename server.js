const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

const natureData = require("./data/natureData");

app.use(express.json());

/* =========================
   🌿 PREMIUM ACCESS SYSTEM
   ========================= */

function sanitizePlant(item, premium = false) {

  if (premium) return item;

  return {
    id: item.id,
    name: item.name,
    scientificName: item.scientificName,
    type: item.type,
    category: item.category,
    origin: item.origin,
    benefits: item.benefits,
    conditions: item.conditions,
    skincareUses: item.skincareUses,
    level: item.level,

    premiumLocked:
      item.level === "premium",

    lockedFeatures:
      item.level === "premium"
        ? [
            "Advanced chemistry",
            "Dosage intelligence",
            "Clinical herbal analysis"
          ]
        : []
  };
}

/* =========================
   🧠 INTELLIGENCE SCORING
   ========================= */

function calculateScore(item, query) {

  let score = 0;

  const q = query.toLowerCase();

  if (item.name.toLowerCase().includes(q))
    score += 50;

  if (
    item.conditions?.some(c =>
      c.toLowerCase().includes(q)
    )
  ) score += 40;

  if (
    item.benefits?.some(b =>
      b.toLowerCase().includes(q)
    )
  ) score += 30;

  return score;
}

/* =========================
   🌿 SMART SEARCH ENGINE
   ========================= */

app.get("/nature", (req, res) => {

  const search =
    req.query.search || "";

  const premium =
    req.query.premium === "true";

  let results = natureData.map(item => {

    const cleanItem =
      sanitizePlant(item, premium);

    return {
      ...cleanItem,
      score: search
        ? calculateScore(item, search)
        : 1
    };
  });

  if (search) {

    results = results
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

  }

  res.json(results);
});

/* =========================
   🔍 CONDITION ENGINE
   ========================= */

app.get("/conditions/:name", (req, res) => {

  const premium =
    req.query.premium === "true";

  const condition =
    req.params.name.toLowerCase();

  const results = natureData
    .filter(item =>
      item.conditions?.some(c =>
        c.toLowerCase() === condition
      )
    )
    .map(item =>
      sanitizePlant(item, premium)
    );

  res.json({
    condition,
    totalResults: results.length,
    results
  });
});

/* =========================
   🌱 SINGLE PLANT ENGINE
   ========================= */

app.get("/plant/:name", (req, res) => {

  const premium =
    req.query.premium === "true";

  const name =
    req.params.name.toLowerCase();

  const plant =
    natureData.find(p =>
      p.name.toLowerCase() === name
    );

  if (!plant) {
    return res
      .status(404)
      .json({
        error: "Plant not found"
      });
  }

  res.json(
    sanitizePlant(plant, premium)
  );
});

/* =========================
   🚀 FRONTEND
   ========================= */

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

/* =========================
   🚀 START SERVER
   ========================= */

app.listen(PORT, () => {

  console.log(
    `🌿 Nature Core AI running on port ${PORT}`
  );

});
