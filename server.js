const express = require("express");
const cors = require("cors");

const supabase = require("./supabaseClient");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "Nature Core AI API Running"
  });
});

app.get("/nature", async (req, res) => {

  const search = req.query.search || "";

  let query = supabase
    .from("plants")
    .select("*");

  if(search){

    query = query.ilike(
      "name",
      `%${search}%`
    );
  }

  const { data, error } = await query;

  if(error){

    return res.status(500).json({
      error: error.message
    });
  }

  res.json(data);
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(
    `🌿 Nature Core AI running on port ${PORT}`
  );
});
