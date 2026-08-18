require('dotenv').config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabaseClient");

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_KEYS = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3
].filter(Boolean);
let keyIndex = 0;
function getGroqKey(){ const k = GROQ_KEYS[keyIndex % GROQ_KEYS.length]; keyIndex++; return k; }

async function callGroq(messages, maxTokens = 1000) {
  const maxAttempts = GROQ_KEYS.length * 2;
  let lastError = '';
  for(let attempt = 0; attempt < maxAttempts; attempt++){
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getGroqKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openai/gpt-oss-20b', max_tokens: maxTokens, messages })
      });
      const data = await response.json();
      if(data.error){
        lastError = data.error.message;
        console.log(`Groq attempt ${attempt+1}/${maxAttempts} failed:`, lastError);
        if(data.error.code === 'rate_limit_exceeded' || response.status === 429){
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        continue;
      }
      const content = data.choices?.[0]?.message?.content;
      if(content) return content;
      lastError = 'Empty response from model';
      console.log(`Groq attempt ${attempt+1}/${maxAttempts}: empty content`);
    } catch(e) {
      lastError = e.message;
      console.log(`Groq attempt ${attempt+1}/${maxAttempts} exception:`, e.message);
    }
  }
  console.log('All Groq attempts exhausted. Last error:', lastError);
  return '';
}

async function fetchPubMed(query, maxResults = 3) {
  try {
    const apiKey = process.env.NCBI_KEY ? `&api_key=${process.env.NCBI_KEY}` : '';
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json${apiKey}`
    );
    const searchData = await searchRes.json();
    const ids = searchData.esearchresult?.idlist || [];
    if (!ids.length) return [];
    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json${apiKey}`
    );
    const summaryData = await summaryRes.json();
    return ids.map(id => ({
      id,
      title: summaryData.result[id]?.title || '',
      authors: (summaryData.result[id]?.authors || []).slice(0,2).map(a => a.name).join(', '),
      journal: summaryData.result[id]?.fulljournalname || '',
      year: (summaryData.result[id]?.pubdate || '').split(' ')[0],
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
    })).filter(p => p.title);
  } catch(e) {
    console.log('PubMed error:', e.message);
    return [];
  }
}

async function fetchWikipedia(plantName) {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(plantName)}`);
    const data = await res.json();
    return data.extract || null;
  } catch(e) { return null; }
}

app.get("/", (req, res) => {
  res.json({ status: "Nature Core AI API Running", version: "2.0" });
});

app.get("/nature", async (req, res) => {
  try {
    const search = req.query.search || "";
    let query = supabase.from("plants").select("*");
    if(search){
      query = query.or(`name.ilike.%${search}%,conditions.cs.{${search}},benefits.cs.{${search}}`);
    }
    const { data, error } = await query;
    if(error) return res.status(500).json({ error: error.message });

    if((!data || data.length === 0) && search){
      try {
        const wiki = await fetchWikipedia(search);
        if(wiki){
          const plantJson = await callGroq([{
            role: 'user',
            content: `Based on: ${wiki}\n\nReturn ONLY valid JSON for plant "${search}": {name, scientific_name, type, category, origin, properties(array 3), benefits(array 3), conditions(array 3), skincare_uses(array 2), preparation(array 2), warnings(array 1), chemistry({compounds:[2 strings],class:string}), level("free")}. Pure JSON only.`
          }], 1500);
          const parsed = JSON.parse(plantJson.replace(/```json|```/g,'').trim());
          await supabase.from('plants').insert([parsed]);
          return res.json([parsed]);
        }
      } catch(e) { console.log('Smart lookup failed:', e.message); }
    }
    res.json(data || []);
  } catch(e) {
    console.log('Error in /nature:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/ask", async (req, res) => {
  try {
    const { question, history = [], preferred_language = 'english', user_level = 0 } = req.body;

    const { data: plants } = await supabase
      .from("plants")
      .select("name, benefits, conditions, preparation, warnings")
      .limit(20);

    const studies = await fetchPubMed(question + ' medicinal plant herbal', 3);

    const levelNote = user_level === 0
      ? 'User is FREE tier. Give a helpful basic answer with 3-4 plants and simple preparation. End with: "Upgrade to Level 1 Herbalist (5,000 Naira/month) for detailed dosages, drug interactions, and research citations."'
      : user_level >= 2
      ? 'User is ADVANCED. Give full expert answer with compounds, mechanisms, dosages, and cite studies as [1][2][3].'
      : 'User is LEVEL 1 Herbalist. Give complete expert answer with preparations, dosages, warnings, and how each plant works biochemically.';

    const systemPrompt = `You are Nature Core AI, an expert in African and global medicinal plants combining knowledge of a doctor, pharmacist, botanist, and traditional herbalist.

${levelNote}

RULES:
- Answer in English by default unless user writes in another language
- For traditional, cultural, or spiritual questions (signs, symbols, omens, sacred plants, ceremonies): present them as genuine cultural knowledge — "In Yoruba tradition, X is believed to mean..." — informative and respectful, neither mocking nor asserting as scientifically proven fact
- Distinguish clearly between scientifically-backed medicinal use and traditional/spiritual use when both apply to a plant
- For traditional remedies used for serious illness, still note when medical consultation is important
- Recommend ALL natural ingredients: plants, foods, spices, roots, barks, seeds, oils, minerals
- Give specific, expert-level, actionable information
- NEVER give links or say visit website, give all information directly
- Structure answer clearly with condition, recommended treatments, how they work, and preparation`;

    const studiesContext = studies.length > 0
      ? "\n\nRelevant studies: " + studies.map((s,i) => "[" + (i+1) + "] " + s.title + " (" + s.year + ")").join(". ")
      : '';

    const userMessage = "Plant database: " + JSON.stringify(plants) + "\n\nQuestion: " + question + studiesContext;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-4),
      { role: 'user', content: userMessage }
    ];

    const answer = await callGroq(messages, 2500);

    let finalAnswer = answer;
    if(studies.length > 0){
      finalAnswer += "\n\n**Research Sources:**\n" + studies.map((s,i) => "[" + (i+1) + "] " + s.title + " — [Read Study](" + s.url + ")").join("\n");
    }

    res.json({ answer: finalAnswer, studies });
  } catch(e) {
    console.log('Error in /ask:', e.message);
    res.status(500).json({ error: e.message, answer: 'Sorry, an error occurred. Please try again.' });
  }
});

app.post("/formulate", async (req, res) => {
  try {
    const { goal } = req.body;
    const { data: plants } = await supabase
      .from("plants")
      .select("name, scientific_name, benefits, skincare_uses, properties, preparation")
      .limit(30);

    const formula = await callGroq([
      { role: 'system', content: 'You are Nature Core AI Formulation Assistant, an expert cosmetic chemist and herbalist. Create professional herbal formulations with: 1) Product name 2) Complete ingredient list with exact percentages totaling 100% 3) Step-by-step manufacturing process 4) Shelf life and preservation 5) Estimated cost in Naira 6) Safety warnings. Be specific and professional.' },
      { role: 'user', content: "Available plants: " + JSON.stringify(plants) + "\n\nFormulation request: " + goal }
    ], 2500);

    res.json({ formula });
  } catch(e) {
    console.log('Error in /formulate:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/generate-exam", async (req, res) => {
  try {
    const { level_id } = req.body;
    const { data: plants } = await supabase.from("plants").select("name, scientific_name, benefits, conditions").limit(15);

    const topics = {
      1: "basic African medicinal plants, common conditions they treat, simple preparation methods",
      2: "plant chemistry, active compounds, formulation, drug interactions",
      3: "clinical herbalism, pharmacology, disease management",
      4: "advanced research, business formulation, regulatory compliance"
    };

    const questionsJson = await callGroq([{
      role: 'user',
      content: `Generate 10 multiple choice exam questions about: ${topics[level_id] || topics[1]}.
Use this plant data: ${JSON.stringify(plants.slice(0,8))}.
Return ONLY a JSON array of exactly 10 objects with these exact keys:
{"question":"text","option_a":"text","option_b":"text","option_c":"text","option_d":"text","correct_answer":"a","explanation":"text"}

CRITICAL RULES:
- Do NOT use apostrophes or single quotes anywhere in the text (write "what is" not "what's", write "plant is" not "plant's")
- Do NOT use double quotes inside the text values
- Keep each explanation under 15 words
- Pure JSON array only, no markdown, no extra text, no trailing commas`
    }], 3000);

    function repairJson(str){
  return str
    .replace(/```json|```/g,'')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/,(\s*[\]\}])/g, '$1')
    .trim();
}
let cleaned = repairJson(questionsJson);
    // Try to extract just the array if there's extra text
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if(arrStart !== -1 && arrEnd !== -1){
      cleaned = cleaned.substring(arrStart, arrEnd + 1);
    }
    let questions;
    try {
      questions = JSON.parse(cleaned);
    } catch(parseErr) {
      // Retry once with explicit re-request
      console.log('First parse failed, retrying exam generation...');
      const retryJson = await callGroq([{
        role: 'user',
        content: `Return ONLY a valid JSON array of 10 multiple choice questions about medicinal plants. Each object must have exactly these keys: question, option_a, option_b, option_c, option_d, correct_answer, explanation. Use simple ASCII quotes only, no special characters. Pure JSON array, nothing else.`
      }], 3000);
      let retryCleaned = repairJson(retryJson);
      const rStart = retryCleaned.indexOf('[');
      const rEnd = retryCleaned.lastIndexOf(']');
      if(rStart !== -1 && rEnd !== -1) retryCleaned = retryCleaned.substring(rStart, rEnd + 1);
      questions = JSON.parse(retryCleaned);
    }
    const toInsert = questions.map(q => ({ ...q, level_id }));
    await supabase.from('exam_questions').insert(toInsert);
    res.json({ questions });
  } catch(e) {
    console.log('Error in /generate-exam:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/submit-exam", async (req, res) => {
  try {
    const { user_id, level_id, answers, questions } = req.body;
    let correct = 0;
    const results = questions.map((q, i) => {
      const isCorrect = answers[i] === q.correct_answer;
      if(isCorrect) correct++;
      return { question: q.question, selected: answers[i], correct: q.correct_answer, passed: isCorrect, explanation: q.explanation };
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= 70;

    if(passed){
      const certId = 'NCAI-' + Date.now() + '-L' + level_id;
      const { data: profile } = await supabase.from('profiles').select('full_name, email').eq('id', user_id).single();
      const waitingUntil = new Date();
      waitingUntil.setDate(waitingUntil.getDate() + 7);

      await supabase.from('certificates').insert([{
        id: certId,
        user_id,
        user_name: profile?.full_name || 'Nature Core Student',
        user_email: profile?.email || '',
        level_id,
        level_name: ['Explorer','Herbalist','Practitioner','Specialist','Master'][level_id] || 'Herbalist',
        exam_score: score
      }]);

      await supabase.from('user_progress').upsert([{
        user_id, level_id, status: 'passed', exam_score: score,
        passed_at: new Date().toISOString(),
        certificate_id: certId,
        waiting_until: waitingUntil.toISOString()
      }]);

      await supabase.from('profiles').update({ level: level_id }).eq('id', user_id);
      res.json({ passed, score, results, certId, waitingUntil });
    } else {
      await supabase.from('user_progress').upsert([{
        user_id, level_id, status: 'failed', exam_score: score,
        exam_taken_at: new Date().toISOString()
      }]);
      res.json({ passed, score, results });
    }
  } catch(e) {
    console.log('Error in /submit-exam:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/progress/:user_id", async (req, res) => {
  try {
    const { data } = await supabase.from('user_progress').select('*').eq('user_id', req.params.user_id);
    res.json(data || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/verify/:cert_id", async (req, res) => {
  try {
    const { data } = await supabase.from('certificates').select('*').eq('id', req.params.cert_id).single();
    if(!data) return res.status(404).json({ valid: false, message: 'Certificate not found' });
    res.json({ valid: true, certificate: data });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🌿 Nature Core AI v2.0 running on port ${PORT}`));
