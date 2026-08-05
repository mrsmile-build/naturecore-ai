require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const GROQ_KEY = process.env.GROQ_KEY_1;

const NEW_PLANTS = [
  "African Wormwood","Sausage Tree","Velvet Tamarind","African Star Apple",
  "Bush Mango","African Breadfruit","Achi","Ogbono","Agbalumo","Udara",
  "Agba Tree","Okoubaka","African Nutmeg","Grains of Paradise","Atare",
  "Uziza Berry","Efinrin","African Tulip","Pawpaw Root","Guava Bark",
  "Soursop Bark","Moringa Flower","Hibiscus Seed","Zobo Leaf","Baobab Fruit",
  "Shea Bark","African Mahogany","Iroko","Obeche","Obi Abata",
  "Bush Pepper","Climbing Black Pepper","Monkey Cola","African Plum",
  "Agbalumo Bark","African Pear","Ube","Nsala","Utazi Berry",
  "Oha Seed","Ogiri Igbo","African Hemp","Kenaf","Jute Leaf",
  "Okazi","Afang","Waterleaf Root","Telfairia Seed","Egusi",
  "Ede Ito","Bitter Melon Leaf","African Basil Root","Holy Basil Root",
  "Turmeric Leaf","Ginger Flower","Garlic Skin","Onion Skin","Coconut Husk",
  "Banana Peel","Pineapple Skin","Mango Seed","Avocado Seed","Pawpaw Seed",
  "Watermelon Seed","Pumpkin Seed","Sesame","Groundnut","Tiger Nut Milk",
  "Zobo Drink","Palm Wine","Kunu","Fura de Nono","Ogi",
  "African Locust Bean","Iru","Ogiri Ofi","Okpei","Daddawa",
  "Sulfur Mineral","Clay Soil","Charcoal","Sea Salt","Rock Salt",
  "Honey","Propolis","Beeswax","Royal Jelly","Raw Shea Butter",
  "Palm Kernel Oil","Coconut Oil","Castor Oil","Neem Oil","Black Seed Oil",
  "Frankincense Resin","Myrrh Resin","Camphor","Aloe Juice","Cucumber"
];

async function generatePlant(name){
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    headers:{'Authorization':`Bearer ${GROQ_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'llama-3.1-8b-instant',
      max_tokens:500,
      messages:[{role:'user',content:`Return ONLY valid JSON for this natural medicine ingredient: "${name}". Fields: name(string), scientific_name(string), type(string like Leaf/Root/Seed/Oil/Mineral/Fruit/Bark/Resin/Food), category(string like Medicine/Skincare/Nutrition), origin(string), properties(array of 3 strings), benefits(array of 3 strings), conditions(array of 3 plain text strings - NOT JSON objects), skincare_uses(array of 2 strings), preparation(array of 2 strings), warnings(array of 1 string), chemistry({compounds:["compound1","compound2"],class:"string"}), level("free" or "premium"). IMPORTANT: conditions must be plain text strings, not JSON objects. Pure JSON only.`}]
    })
  });
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  const text = d.choices[0].message.content;
  return JSON.parse(text.replace(/```json|```/g,'').trim());
}

async function run(){
  const {data:existing} = await sb.from('plants').select('name');
  const existingNames = (existing||[]).map(p=>p.name.toLowerCase());
  const toProcess = NEW_PLANTS.filter(p=>!existingNames.includes(p.toLowerCase()));
  console.log(`Processing ${toProcess.length} new plants...`);
  let success=0, failed=0;
  for(const name of toProcess){
    try{
      process.stdout.write(`${name}... `);
      const data = await generatePlant(name);
      // Ensure conditions are strings not objects
      if(data.conditions){
        data.conditions = data.conditions.map(c => 
          typeof c === 'object' ? (c.name || c.condition || c.Condition || JSON.stringify(c)) : String(c)
        );
      }
      const {error} = await sb.from('plants').insert([data]);
      if(error) throw new Error(error.message);
      console.log('✅');
      success++;
      await new Promise(r=>setTimeout(r,1200));
    }catch(e){
      console.log(`❌ ${e.message.slice(0,40)}`);
      failed++;
    }
  }
  console.log(`\nDone! ${success} added, ${failed} failed`);
}
run();
