const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

const PORT = process.env.PORT || 4000;

const plants = [
{
name:"Neem",
scientificName:"Azadirachta indica",
conditions:["Acne","Pimples","Malaria"],
benefits:[
"Skin treatment",
"Immune support",
"Blood purification"
],
preparation:
"Boil leaves for tea or crush into paste.",
warnings:
"Avoid excess consumption.",
premiumLocked:false
},

{
name:"Ginger",
scientificName:"Zingiber officinale",
conditions:["Cough","Ulcer","Cold"],
benefits:[
"Digestion",
"Cold relief",
"Pain reduction"
],
preparation:
"Boil in water and mix with honey.",
warnings:
"Too much may irritate stomach.",
premiumLocked:false
},

{
name:"Moringa",
scientificName:"Moringa oleifera",
conditions:[
"Weakness",
"Diabetes",
"Malnutrition"
],
benefits:[
"Energy boosting",
"Blood sugar support"
],
preparation:
"Dry leaves into powder or tea.",
warnings:
"Pregnant women should consult doctor.",
premiumLocked:true
}
];

app.get("/", (req,res)=>{
res.send("Nature Core AI Backend Running");
});

app.get("/api/plants",(req,res)=>{
res.json(plants);
});

app.listen(PORT,()=>{
console.log(
`🌿 Nature Core AI running on port ${PORT}`
);
});
