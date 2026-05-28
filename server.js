const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

const natureData = require("./data/natureData");

app.get("/", (req, res) => {
  res.send("🌿 Nature Core AI Backend Running");
});

app.get("/nature", (req, res) => {

  const search = req.query.search?.toLowerCase() || "";

  if (!search) {
    return res.json(natureData);
  }

  const filtered = natureData.filter(item =>
    item.name.toLowerCase().includes(search) ||
    item.conditions.some(c =>
      c.toLowerCase().includes(search)
    )
  );

  res.json(filtered);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🌿 Nature Core AI running on port ${PORT}`);
});
