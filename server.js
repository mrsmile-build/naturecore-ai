const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

/*
🧠 NATURE CORE AI BACKEND CORE
- serves frontend
- provides intelligence API
- prepares for AI ranking system
*/

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   🌿 HERBAL INTELLIGENCE DATA LAYER
   ========================= */

const natureData = require("./data/natureData");

/* =========================
   🔍 BASIC INTELLIGENCE API
   ========================= */

app.get("/nature", (req, res) => {
  const search = (req.query.search || "").toLowerCase();

  if (!search) return res.json(natureData);

  const filtered = natureData.filter(item =>
    item.name.toLowerCase().includes(search) ||
    (item.conditions && item.conditions.join(" ").toLowerCase().includes(search)) ||
    (item.benefits && item.benefits.join(" ").toLowerCase().includes(search))
  );

  res.json(filtered);
});

/* =========================
   🧠 CONDITION INTELLIGENCE ENGINE (PHASE 2 READY)
   ========================= */

app.get("/conditions/:name", (req, res) => {
  const condition = req.params.name.toLowerCase();

  const results = natureData.filter(item =>
    item.conditions &&
    item.conditions.map(c => c.toLowerCase()).includes(condition)
  );

  res.json({
    condition,
    results
  });
});

/* =========================
   🔬 PLANT DETAIL ENGINE
   ========================= */

app.get("/plant/:name", (req, res) => {
  const name = req.params.name.toLowerCase();

  const plant = natureData.find(p =>
    p.name.toLowerCase() === name
  );

  if (!plant) {
    return res.status(404).json({ error: "Plant not found" });
  }

  res.json(plant);
});

/* =========================
   🚀 START SERVER
   ========================= */

app.listen(PORT, () => {
  console.log(`🌿 Nature Core AI running on port ${PORT}`);
});
