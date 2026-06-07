require('dotenv').config();
const localTerms = require('./localTerms');

function translateQuery(question) {
  let translated = question.toLowerCase();
  for (const [local, english] of Object.entries(localTerms)) {
    if (translated.includes(local)) {
      translated = translated.replace(local, english);
    }
  }
  return translated;
}
const express = require("express");
const cors = require("cors");
const supabase = require("./supabaseClient");

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_KEYS = [process.env.GROQ_KEY_1, process.env.GROQ_KEY_2, process.env.GROQ_KEY_3].filter(Boolean);
let keyIndex = 0;
function getGroqKey(){ const k = GROQ_KEYS[keyIndex % GROQ_KEYS.length]; keyIndex++; return k; }

async function searchPubMed(plantName) {
  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(plantName + ' medicinal plant')}&retmax=3&retmode=json`
    );
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult.idlist;
    if (!ids.length) return null;

    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`
    );
    const summaryData = await summaryRes.json();
    const articles = ids.map(id => summaryData.result[id]?.title).filter(Boolean);
    return articles.join('. ');
  } catch (e) { return null; }
}

async function searchWikipedia(plantName) {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(plantName)}`
    );
    const data = await res.json();
    return data.extract || null;
  } catch (e) { return null; }
}

async function structureWithGroq(plantName, pubmedData, wikiData) {
  const context = [
    pubmedData ? `PubMed: ${pubmedData}` : '',
    wikiData ? `Wikipedia: ${wikiData}` : ''
  ].filter(Boolean).join('\n\n');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getGroqKey()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Based on this scientific data about ${plantName}:\n${context}\n\nReturn ONLY valid JSON with these exact fields: name, scientific_name, type (Leaf/Root/Bark/Fruit/Seed/Whole Plant), category (Medicine/Skincare/Nutrition), origin, properties (array of 3), benefits (array of 3), conditions (array of 3), skincare_uses (array of 2), preparation (array of 2), warnings (array of 1), chemistry ({compounds:[array of 2], class:string}), level (free). No explanation. No markdown. Pure JSON only.`
      }]
    })
  });

  const data = await response.json();
  const text = data.choices[0].message.content;
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function smartLookup(plantName) {
  console.log(`🔍 Smart lookup: ${plantName}`);
  const [pubmedData, wikiData] = await Promise.all([
    searchPubMed(plantName),
    searchWikipedia(plantName)
  ]);

  if (!pubmedData && !wikiData) return null;

  const plantData = await structureWithGroq(plantName, pubmedData, wikiData);
  const { error } = await supabase.from('plants').insert([plantData]);
  if (!error) console.log(`✅ Auto-saved: ${plantData.name}`);
  return plantData;
}

app.get("/", (req, res) => {
  res.json({ status: "Nature Core AI API Running" });
});

app.get("/nature", async (req, res) => {
  const search = req.query.search || "";

  let query = supabase.from("plants").select("*");

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  if (data.length === 0 && search) {
    try {
      const smartResult = await smartLookup(search);
      if (smartResult) return res.json([smartResult]);
    } catch (e) {
      console.log('Smart lookup failed:', e.message);
    }
  }

  res.json(data);
});

app.post("/ask", async (req, res) => {
  const { question } = req.body;

  const { data: plants } = await supabase
    .from("plants")
    .select("name, benefits, conditions, preparation, warnings");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${getGroqKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: "You are Nature Core AI — the world's most advanced natural medicine intelligence system. You are fluent in ALL world languages including Yoruba, Hausa, Igbo, Pidgin, Swahili, Arabic, Hindi, French, Portuguese, and every other language. You combine the knowledge of a medical doctor, pharmacist, biochemist, botanist, pharmacognosist, and traditional healer from every culture.

LANGUAGE RULE: When a user writes in any language or uses any local/traditional health term:
- Immediately identify the language
- Translate the condition to English
- State what it means clearly
- Then answer fully

YORUBA EXAMPLES (for reference):
- ori fifo = headache (ori=head, fifo=breaking/pounding)
- oju = eye (oju arun = eye disease)
- iba = malaria/fever
- jedijedi = hemorrhoids/piles
- abosi = appendicitis
- oje = dysentery

ANSWER FORMAT for every question:
1. Condition: [name in English + original language + other names worldwide]
2. What it is: [clear medical explanation]
3. Why it happens: [biological/physiological cause]
4. Recommended natural treatments: [plants, foods, roots, barks, seeds from database + others known worldwide]
5. How each works: [biochemical mechanism, active compounds]
6. Preparation & dosage: [specific instructions]
7. Drug interactions & warnings: [safety information]
8. Scientific evidence: [reference studies if known]

Never refuse. Always translate. Always help. Cover ALL natural ingredients — not just plants but also foods, spices, roots, barks, seeds, oils, and minerals."
        },
        {
          role: "user",
          content: `Plant database: ${JSON.stringify(plants)}\n\nQuestion: ${translateQuery(question)}\n\nOriginal question: ${question}`
        }
      ]
    })
  });

  const data = await response.json();
  res.json({ answer: data.choices[0].message.content });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🌿 Nature Core AI running on port ${PORT}`);
});
