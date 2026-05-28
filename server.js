<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>

<title>Nature Core AI</title>

<style>

*{
margin:0;
padding:0;
box-sizing:border-box;
}

body{
font-family:Arial,sans-serif;
background:#020617;
color:white;
padding:20px;
}

header{
text-align:center;
margin-top:30px;
margin-bottom:40px;
}

header h1{
font-size:50px;
color:#22c55e;
margin-bottom:10px;
}

header p{
color:#cbd5e1;
max-width:700px;
margin:auto;
line-height:1.6;
}

.search-box{
max-width:700px;
margin:30px auto;
background:#1e293b;
padding:14px;
border-radius:20px;
}

.search-box input{
width:100%;
padding:18px;
border:none;
outline:none;
border-radius:14px;
background:#0f172a;
color:white;
font-size:16px;
}

.stats{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
gap:20px;
margin:40px 0;
}

.stat-card{
background:#1e293b;
padding:30px;
border-radius:20px;
text-align:center;
}

.stat-card h2{
font-size:40px;
color:#22c55e;
}

.stat-card p{
margin-top:10px;
color:#cbd5e1;
}

.cards{
display:grid;
grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
gap:20px;
margin-top:40px;
}

.card{
background:#1e293b;
padding:25px;
border-radius:20px;
cursor:pointer;
transition:0.3s;
}

.card:hover{
transform:translateY(-5px);
}

.card h2{
color:#22c55e;
margin-bottom:10px;
}

.scientific{
color:#94a3b8;
font-style:italic;
margin-bottom:15px;
}

.tag{
display:inline-block;
background:#334155;
padding:6px 12px;
border-radius:20px;
margin:5px 5px 0 0;
font-size:13px;
}

.premium{
background:#facc15;
color:black;
}

.loading{
text-align:center;
margin-top:40px;
color:#cbd5e1;
}

footer{
text-align:center;
margin-top:80px;
color:#94a3b8;
}

</style>
</head>

<body>

<header>

<h1>Nature Core AI</h1>

<p>
AI-powered herbal intelligence platform for medicine,
skincare, nutrition, chemistry, and botany.
</p>

</header>

<div class="search-box">

<input
type="text"
id="searchInput"
placeholder="Search acne, malaria, ginger, ulcer..."
/>

</div>

<div class="stats">

<div class="stat-card">
<h2>3</h2>
<p>Medicinal Plants</p>
</div>

<div class="stat-card">
<h2>11</h2>
<p>Conditions</p>
</div>

<div class="stat-card">
<h2>Free + Premium</h2>
<p>Knowledge Levels</p>
</div>

</div>

<div class="loading" id="loading">
Loading Nature Core AI...
</div>

<div class="cards" id="cards"></div>

<footer>
Nature Core AI © 2026 • Herbal Intelligence System
</footer>

<script>

const plants = [

{
name:"Neem",
scientificName:"Azadirachta indica",
conditions:["Acne","Pimples","Malaria"],
benefits:["Skin treatment","Immune support","Blood purification"],
skincareUses:["Face cleansing","Pimple treatment"],
preparation:"Boil leaves for tea or crush into paste.",
warnings:"Avoid excess consumption.",
premiumLocked:false
},

{
name:"Ginger",
scientificName:"Zingiber officinale",
conditions:["Cough","Ulcer","Cold"],
benefits:["Digestion","Cold relief","Pain reduction"],
skincareUses:["Skin glow","Anti-aging support"],
preparation:"Boil in water and mix with honey.",
warnings:"Too much may irritate stomach.",
premiumLocked:false
},

{
name:"Moringa",
scientificName:"Moringa oleifera",
conditions:["Weakness","Diabetes","Malnutrition"],
benefits:["Energy boosting","Blood sugar support"],
skincareUses:["Skin nourishment","Hair strengthening"],
preparation:"Dry leaves into powder or tea.",
warnings:"Pregnant women should consult doctor.",
premiumLocked:true
}

];

const cards =
document.getElementById("cards");

const loading =
document.getElementById("loading");

const searchInput =
document.getElementById("searchInput");

function loadPlants(search=""){

cards.innerHTML = "";

const filtered = plants.filter(item =>
item.name.toLowerCase().includes(search.toLowerCase()) ||
item.conditions.join(" ").toLowerCase().includes(search.toLowerCase())
);

loading.style.display = "none";

filtered.forEach(item=>{

const card =
document.createElement("div");

card.className = "card";

card.onclick = ()=>openModal(item);

card.innerHTML = `

<h2>${item.name}</h2>

<p class="scientific">
${item.scientificName}
</p>

${item.conditions.map(condition=>`
<span class="tag">${condition}</span>
`).join("")}

<br><br>

${item.premiumLocked
?
'<span class="tag premium">🔒 Premium</span>'
:
''
}

`;

cards.appendChild(card);

});

}

function openModal(item){

const modal =
document.createElement("div");

modal.id = "modal";

modal.style.position = "fixed";
modal.style.top = "0";
modal.style.left = "0";
modal.style.width = "100%";
modal.style.height = "100%";
modal.style.background = "rgba(0,0,0,0.9)";
modal.style.padding = "20px";
modal.style.overflowY = "auto";
modal.style.zIndex = "9999";

modal.innerHTML = `

<div style="
max-width:700px;
margin:40px auto;
background:#1e293b;
padding:30px;
border-radius:25px;
position:relative;
">

<button onclick="closeModal()"
style="
position:absolute;
right:20px;
top:20px;
background:red;
color:white;
border:none;
padding:10px 14px;
border-radius:10px;
cursor:pointer;
">
X
</button>

<h1 style="color:#22c55e;">
${item.name}
</h1>

<p style="
color:#94a3b8;
margin-bottom:20px;
font-style:italic;
">
${item.scientificName}
</p>

<h3>Benefits</h3>
<p>${item.benefits.join(", ")}</p>

<h3 style="margin-top:20px;">
Conditions
</h3>
<p>${item.conditions.join(", ")}</p>

<h3 style="margin-top:20px;">
Skincare Uses
</h3>
<p>${item.skincareUses.join(", ")}</p>

<h3 style="margin-top:20px;">
Preparation
</h3>
<p>${item.preparation}</p>

<h3 style="margin-top:20px;">
Warnings
</h3>
<p>${item.warnings}</p>

${
item.premiumLocked
?
`

<div style="
margin-top:30px;
background:#0f172a;
padding:20px;
border-radius:20px;
">

<h2 style="color:#facc15;">
🔒 Premium Herbal Intelligence
</h2>

<p style="margin-top:10px;">
Unlock advanced medicinal analysis,
AI dosage systems,
research intelligence,
and chemistry breakdowns.
</p>

<button style="
margin-top:15px;
background:#22c55e;
color:white;
border:none;
padding:14px 20px;
border-radius:14px;
cursor:pointer;
">
Upgrade to Premium
</button>

</div>

`
:
''
}

</div>

`;

document.body.appendChild(modal);

}

function closeModal(){

const modal =
document.getElementById("modal");

if(modal){
modal.remove();
}

}

searchInput.addEventListener("input",(e)=>{
loadPlants(e.target.value);
});

loadPlants();

</script>

</body>
</html>
