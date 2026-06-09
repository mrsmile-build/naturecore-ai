require('dotenv').config();
const express = require("express");
const cors = require("cors");
const supabase = require("./supabaseClient");

const app = express();
app.use(cors());
app.use(express.json());

// Groq key rotation
const GROQ_KEYS = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3
].filter(Boolean);
let keyIndex = 0;
function getGroqKey(){ const k = GROQ_KEYS[keyIndex % GROQ_KEYS.length]; keyIndex++; return k; }

// ============ HELPER FUNCTIONS ============

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
      authors: summaryData.result[id]?.authors?.map(a => a.name).slice(0,3).join(', ') || '',
      journal: summaryData.result[id]?.fulljournalname || '',
      year: summaryData.result[id]?.pubdate?.split(' ')[0] || '',
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
    })).filter(p => p.title);
  } catch(e) { return []; }
}

async function fetchNCBICompounds(plantName) {
  try {
    const apiKey = process.env.NCBI_KEY ? `&api_key=${process.env.NCBI_KEY}` : '';
    const res = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pccompound&term=${encodeURIComponent(plantName)}&retmax=3&retmode=json${apiKey}`
    );
    const data = await res.json();
    return data.esearchresult?.idlist || [];
  } catch(e) { return []; }
}

async function fetchPubChem(compoundName) {
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(compoundName)}/property/MolecularFormula,MolecularWeight,IUPACName/JSON`
    );
    const data = await res.json();
    return data.PropertyTable?.Properties?.[0] || null;
  } catch(e) { return null; }
}

async function fetchWikipedia(plantName) {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(plantName)}`);
    const data = await res.json();
    return data.extract || null;
  } catch(e) { return null; }
}

async function callGroq(messages, maxTokens = 1500) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getGroqKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', max_tokens: maxTokens, messages })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ============ ROUTES ============

app.get("/", (req, res) => res.json({ status: "Nature Core AI API Running", version: "2.0" }));

// Search plants with smart lookup
app.get("/nature", async (req, res) => {
  const search = req.query.search || "";
  let query = supabase.from("plants").select("*");
  if(search){
    query = query.or(`name.ilike.%${search}%,conditions.cs.{${search}},benefits.cs.{${search}}`);
  }
  const { data, error } = await query;
  if(error) return res.status(500).json({ error: error.message });

  if((!data || data.length === 0) && search){
    try {
      const [wiki, pubmed] = await Promise.all([fetchWikipedia(search), fetchPubMed(search + ' medicinal plant', 2)]);
      if(wiki || pubmed.length > 0){
        const context = [wiki ? `Wikipedia: ${wiki}` : '', pubmed.length ? `Research: ${pubmed.map(p=>p.title).join('. ')}` : ''].filter(Boolean).join('\n\n');
        const plantJson = await callGroq([{
          role: 'user',
          content: `Based on this data about ${search}:\n${context}\n\nReturn ONLY valid JSON: {name, scientific_name, type, category, origin, properties(array 3), benefits(array 3), conditions(array 3), skincare_uses(array 2), preparation(array 2), warnings(array 1), chemistry({compounds:[2], class:string}), level("free")}. Pure JSON only.`
        }], 600);
        const parsed = JSON.parse(plantJson.replace(/```json|```/g,'').trim());
        await supabase.from('plants').insert([parsed]);
        return res.json([parsed]);
      }
    } catch(e) { console.log('Smart lookup failed:', e.message); }
  }
  res.json(data || []);
});

// AI Chat with PubMed citations
app.post("/ask", async (req, res) => {
  const { question, history = [] } = req.body;
  const { data: plants } = await supabase.from("plants").select("name, benefits, conditions, preparation, warnings, chemistry");

  // Fetch PubMed studies for the question
  const studies = await fetchPubMed(question + ' medicinal plant herbal', 3);
  const studiesContext = studies.length > 0
    ? `\n\nRELEVANT SCIENTIFIC STUDIES:\n${studies.map((s,i) => `[${i+1}] ${s.title} — ${s.authors} (${s.year}), ${s.journal}`).join('\n')}`
    : '';

  const systemPrompt = `You are Nature Core AI — the world's most advanced natural medicine intelligence platform. You combine the expertise of a medical doctor, pharmacist, biochemist, botanist, and traditional herbalist from every culture.

LANGUAGE: You understand ALL world languages. If the user writes in Yoruba, Hausa, Igbo, Pidgin, Arabic, French, or any language — identify it, translate the condition, then answer in the SAME language they used.

RESPONSE FORMAT — Always structure your answer like this:
**Condition:** [Name in English + local name if applicable]
**What it is:** [Clear medical explanation]
**Why it happens:** [Biological/physiological cause]
**Recommended Natural Treatments:**
[List plants, foods, roots, barks, seeds with specific reasons]
**How They Work:** [Biochemical mechanisms and active compounds]
**Preparation & Dosage:** [Specific instructions with amounts]
**Warnings & Drug Interactions:** [Safety information]
**Scientific Evidence:** [Cite provided studies if relevant with [1], [2], etc.]

RULES:
- Never refuse health questions
- Always mention specific plants from the database
- Cover ALL natural ingredients — plants, foods, spices, roots, barks, seeds, oils
- Give expert-level, actionable, specific answers
- If studies are provided, reference them with numbers`;

  const answer = await callGroq([
    { role: 'system', content: systemPrompt },
    ...history.slice(-6),
    { role: 'user', content: `Plant database: ${JSON.stringify(plants)}${studiesContext}\n\nQuestion: ${question}` }
  ], 1500);

  // Append study links if available
  let finalAnswer = answer;
  if(studies.length > 0){
    finalAnswer += '\n\n**Research Sources:**\n' + studies.map((s,i) => `[${i+1}] ${s.title} — [Read Study](${s.url})`).join('\n');
  }

  res.json({ answer: finalAnswer, studies });
});

// Formulation Assistant
app.post("/formulate", async (req, res) => {
  const { goal } = req.body;
  const { data: plants } = await supabase.from("plants").select("name, scientific_name, benefits, skincare_uses, properties, chemistry, preparation");

  const formula = await callGroq([
    { role: 'system', content: 'You are Nature Core AI Formulation Assistant — an expert cosmetic chemist, herbalist, and natural product formulator. Create professional herbal formulations. Always provide: 1) Product name and purpose 2) Complete ingredient list with EXACT percentages totaling 100% 3) Step-by-step manufacturing process with temperatures and times 4) Equipment needed 5) Preservation method and shelf life 6) Packaging recommendations 7) Estimated cost in Naira (materials) 8) Suggested retail price 9) Safety warnings and patch test instructions. Be precise and professional.' },
    { role: 'user', content: `Available plant database: ${JSON.stringify(plants)}\n\nFormulation request: ${goal}` }
  ], 1500);

  res.json({ formula });
});

// Generate AI exam questions for a level
app.post("/generate-exam", async (req, res) => {
  const { level_id } = req.body;
  const { data: plants } = await supabase.from("plants").select("name, scientific_name, benefits, conditions, chemistry, preparation").limit(20);

  const levelTopics = {
    1: "basic medicinal plants, common conditions they treat, simple preparation methods",
    2: "plant chemistry, active compounds, advanced formulation, drug interactions",
    3: "clinical herbalism, pharmacology, disease management, research interpretation",
    4: "advanced research, business formulation, regulatory compliance, global herbal systems",
    5: "master level — teaching methodology, research design, certification standards"
  };

  const topic = levelTopics[level_id] || levelTopics[1];
  const questionsJson = await callGroq([{
    role: 'user',
    content: `Generate 10 multiple choice exam questions about: ${topic}. 
Use this plant data for context: ${JSON.stringify(plants.slice(0,10))}.
Return ONLY a JSON array of exactly 10 objects, each with:
{
  "question": "Question text here?",
  "option_a": "First option",
  "option_b": "Second option", 
  "option_c": "Third option",
  "option_d": "Fourth option",
  "correct_answer": "a",
  "explanation": "Why this answer is correct"
}
Pure JSON array only. No markdown.`
  }], 1500);

  try {
    const questions = JSON.parse(questionsJson.replace(/```json|```/g,'').trim());
    // Save to database
    const toInsert = questions.map(q => ({ ...q, level_id }));
    await supabase.from('exam_questions').insert(toInsert);
    res.json({ questions });
  } catch(e) {
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// Submit exam answers
app.post("/submit-exam", async (req, res) => {
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
    // Generate certificate
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
      exam_score: score,
      issued_at: new Date().toISOString()
    }]);

    await supabase.from('user_progress').upsert([{
      user_id,
      level_id,
      status: 'passed',
      exam_score: score,
      passed_at: new Date().toISOString(),
      certificate_id: certId,
      waiting_until: waitingUntil.toISOString()
    }]);

    await supabase.from('profiles').update({ level: level_id }).eq('id', user_id);

    res.json({ passed, score, results, certId, waitingUntil });
  } else {
    await supabase.from('user_progress').upsert([{
      user_id, level_id, status: 'failed', exam_score: score, exam_taken_at: new Date().toISOString()
    }]);
    res.json({ passed, score, results });
  }
});

// Get user progress
app.get("/progress/:user_id", async (req, res) => {
  const { data } = await supabase.from('user_progress').select('*').eq('user_id', req.params.user_id);
  res.json(data || []);
});

// Verify certificate
app.get("/verify/:cert_id", async (req, res) => {
  const { data } = await supabase.from('certificates').select('*').eq('id', req.params.cert_id).single();
  if(!data) return res.status(404).json({ valid: false, message: 'Certificate not found' });
  res.json({ valid: true, certificate: data });
});

// Plant chemistry from PubChem
app.get("/chemistry/:plant_name", async (req, res) => {
  const plantName = req.params.plant_name;
  const [pubchemData, pubmedData] = await Promise.all([
    fetchPubChem(plantName),
    fetchPubMed(plantName + ' chemical compounds active ingredients', 2)
  ]);
  res.json({ pubchem: pubchemData, studies: pubmedData });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🌿 Nature Core AI v2.0 running on port ${PORT}`));
