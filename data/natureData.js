module.exports = [
  {
    id: 1,
    name: "Neem",
    scientificName: "Azadirachta indica",
    type: "Leaf",
    category: "Medicine",
    origin: "Africa & Asia",
    properties: ["Antibacterial", "Antifungal", "Anti-inflammatory"],
    benefits: ["Skin treatment", "Immune support", "Blood purification"],
    conditions: ["Acne", "Pimples", "Malaria", "Skin infections"],
    skincareUses: ["Face cleansing", "Pimple treatment", "Stretch mark support"],
    preparation: ["Boil leaves", "Make paste", "Extract oil"],
    warnings: ["Avoid overdose"],
    chemistry: {
      compounds: ["Nimbin", "Azadirachtin"],
      class: "Natural antibacterial"
    },
    level: "free"
  },

  {
    id: 2,
    name: "Ginger",
    scientificName: "Zingiber officinale",
    type: "Root",
    category: "Medicine",
    origin: "Asia",
    properties: ["Anti-inflammatory", "Antioxidant"],
    benefits: ["Digestion", "Cold relief", "Pain reduction"],
    conditions: ["Cold", "Ulcer", "Nausea"],
    skincareUses: ["Skin glow"],
    preparation: ["Boil in water", "Mix with honey"],
    warnings: ["May cause irritation if excessive"],
    chemistry: {
      compounds: ["Gingerol", "Shogaol"],
      class: "Digestive anti-inflammatory"
    },
    level: "free"
  },

  {
    id: 3,
    name: "Moringa",
    scientificName: "Moringa oleifera",
    type: "Leaf",
    category: "Medicine",
    origin: "Africa",
    properties: ["Vitamin-rich", "Antioxidant"],
    benefits: ["Energy boosting", "Immune support"],
    conditions: ["Weakness", "Malnutrition", "Diabetes"],
    skincareUses: ["Skin nourishment", "Hair growth"],
    preparation: ["Dry leaves", "Make tea"],
    warnings: ["Do not overdose"],
    chemistry: {
      compounds: ["Quercetin", "Chlorogenic acid"],
      class: "Nutritional medicinal plant"
    },
    level: "premium"
  }
];
