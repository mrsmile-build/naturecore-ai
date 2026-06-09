require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const plants = require('./morePlants.json');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const GROQ_KEY = process.env.GROQ_KEY_1 || process.env.GROQ_KEY;

async function generatePlant(name){
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Authorization':`Bearer ${GROQ_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'llama-3.1-8b-instant',
      max_tokens:600,
      messages:[{role:'user',content:`Return ONLY valid JSON for medicinal plant: ${name}. Fields: name(string), scientific_name(string), type(string), category(string), origin(string), properties(array of 3), benefits(array of 3), conditions(array of 3), skincare_uses(array of 2), preparation(array of 2), warnings(array of 1), chemistry({compounds:[2 strings],class:string}), level("free" or "premium"). No markdown. Pure JSON only.`}]
    })
  });
  const d = await r.json();
  return JSON.parse(d.choices[0].message.content.replace(/```json|```/g,'').trim());
}

async function run(){
  // Get existing plant names to avoid duplicates
  const {data:existing} = await supabase.from('plants').select('name');
  const existingNames = (existing||[]).map(p=>p.name.toLowerCase());
  
  const toProcess = plants.filter(p=>!existingNames.includes(p.toLowerCase()));
  console.log(`Processing ${toProcess.length} new plants...`);
  
  let success=0, failed=0;
  for(const name of toProcess){
    try{
      process.stdout.write(`${name}... `);
      const data = await generatePlant(name);
      const {error} = await supabase.from('plants').insert([data]);
      if(error) throw new Error(error.message);
      console.log('✅');
      success++;
      await new Promise(r=>setTimeout(r,1200));
    }catch(e){
      console.log(`❌ ${e.message.slice(0,50)}`);
      failed++;
    }
  }
  console.log(`\nDone! ${success} added, ${failed} failed`);
}

run();
