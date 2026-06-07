require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const GROQ_KEY = process.env.GROQ_KEY;

const PLANT_NAMES = [
  "Neem", "Moringa", "Ginger", "Turmeric", "Aloe Vera",
  "Bitter Leaf", "Scent Leaf", "African Basil", "Shea Butter",
  "Black Seed", "Baobab", "Hibiscus", "African Ginger",
  "Lemongrass", "Pawpaw Leaf", "Garlic", "Onion",
  "Soursop Leaf", "Guava Leaf", "Mango Bark", "Alligator Pepper",
  "Clove", "Cinnamon", "Ashwagandha", "Fenugreek",
  "Fluted Pumpkin", "African Pepper", "Kola Nut", "Ojio",
  "Uziza Leaf", "Utazi Leaf", "Zobo", "Tiger Nut"
];

async function generatePlantData(plantName) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Return ONLY valid JSON for medicinal plant: ${plantName}
Fields required:
- name (common name string)
- scientific_name (string)
- type (one of: Leaf, Root, Bark, Fruit, Seed, Whole Plant)
- category (one of: Medicine, Skincare, Nutrition)
- origin (string)
- properties (array of 3 strings)
- benefits (array of 3 strings)
- conditions (array of 3 strings)
- skincare_uses (array of 2 strings)
- preparation (array of 2 strings)
- warnings (array of 1 string)
- chemistry (object with keys: compounds (array of 2 strings), class (string))
- level (one of: free, premium)
No explanation. No markdown. Pure JSON only.`
      }]
    })
  });
  const data = await response.json();
  const text = data.choices[0].message.content;
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function populatePlants() {
  let success = 0;
  let failed = 0;

  for (const name of PLANT_NAMES) {
    try {
      process.stdout.write(`Processing: ${name}... `);
      const plantData = await generatePlantData(name);
      const { error } = await supabase.from('plants').insert([plantData]);
      if (error) throw new Error(error.message);
      console.log('✅');
      success++;
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🌿 Done! ${success} inserted, ${failed} failed`);
}

populatePlants();
