const supabase = require('./supabaseClient');
const natureData = require('./data/natureData');

async function insertPlants() {
  const plants = natureData.map(plant => ({
    name: plant.name,
    scientific_name: plant.scientificName,
    type: plant.type,
    category: plant.category,
    origin: plant.origin,
    properties: plant.properties,
    benefits: plant.benefits,
    conditions: plant.conditions,
    skincare_uses: plant.skincareUses,
    preparation: plant.preparation,
    warnings: plant.warnings,
    chemistry: plant.chemistry,
    level: plant.level
  }));

  const { data, error } = await supabase
    .from('plants')
    .insert(plants);

  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('✅ Plants inserted successfully!');
  }
}

insertPlants();
