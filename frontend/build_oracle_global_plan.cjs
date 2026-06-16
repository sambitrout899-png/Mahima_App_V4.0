"use strict";
const PptxGenJS = require("pptxgenjs");
const pres = new PptxGenJS();
pres.layout  = "LAYOUT_16x9";
pres.title   = "CS Soft Solutions – Global Oracle Practice Launch Plan";
pres.author  = "CS Soft Solutions";
pres.subject = "Oracle Practice Global GTM";

const C = {
  navy:    "1A2744", red:     "C74634", amber:   "E8A020",
  steel:   "2C4A7C", lightBg: "F4F7FC", cardBg:  "EAEFF8",
  white:   "FFFFFF", dark:    "1A1A2E", mid:     "4A5568",
  muted:   "8896A8", green:   "1E7A4A", greenLt: "E6F4EE",
  redLt:   "FDECEA", amberLt: "FFF3DC", steelLt: "E8EDF8",
  purple:  "5A3A8A", teal:    "1A6A7A",
};

const mkSh = () => ({ type:"outer", color:"000000", blur:5, offset:2, angle:135, opacity:0.10 });
function bg(slide, color) { slide.background = { color }; }
function titleBar(slide, text, barColor, textColor) {
  barColor = barColor || C.navy; textColor = textColor || C.white;
  slide.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.68, fill:{color:barColor}, line:{color:barColor} });
  slide.addText(text, { x:0.38, y:0, w:9.24, h:0.68, fontSize:19, bold:true, color:textColor, valign:"middle", fontFace:"Calibri", margin:0 });
}
function sectionTag(slide, text, x, y, color) {
  color = color || C.red;
  const w = text.length * 0.092 + 0.28;
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h:0.24, fill:{color}, line:{color} });
  slide.addText(text, { x, y, w, h:0.24, fontSize:8, bold:true, color:C.white, align:"center", valign:"middle", fontFace:"Calibri", margin:0 });
}
function card(slide, x, y, w, h, fill, border) {
  fill = fill || C.white; border = border || "D8DFF0";
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill:{color:fill}, line:{color:border, width:1}, shadow:mkSh() });
}
function txt(slide, text, x, y, w, h, opts) {
  opts = opts || {};
  slide.addText(text, Object.assign({ x, y, w, h, fontFace:"Calibri", valign:"top", wrap:true }, opts));
}
function bigStat(slide, value, label, x, y, valColor) {
  valColor = valColor || C.red;
  txt(slide, value, x, y,        2.0, 0.65, { fontSize:34, bold:true, color:valColor, align:"center", valign:"bottom" });
  txt(slide, label, x, y+0.62, 2.0, 0.30, { fontSize:8.5, color:C.muted, align:"center" });
}
function bullets(slide, items, x, y, w, h, size, color) {
  size = size || 11; color = color || C.dark;
  slide.addText(
    items.map((t,i) => ({ text:t, options:{ bullet:true, breakLine: i<items.length-1 } })),
    { x, y, w, h, fontSize:size, color, fontFace:"Calibri", paraSpaceAfter:4, valign:"top" }
  );
}
function geoTag(slide, text, x, y, color) {
  const w = text.length * 0.10 + 0.30;
  slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h:0.26, fill:{color}, line:{color} });
  slide.addText(text, { x, y, w, h:0.26, fontSize:8.5, bold:true, color:C.white, align:"center", valign:"middle", fontFace:"Calibri" });
}

// ══════════════════════════════════════════════
// SLIDE 1 — COVER
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.navy);
  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:0.18, h:5.625, fill:{color:C.red}, line:{color:C.red} });
  s.addShape(pres.shapes.RIGHT_TRIANGLE, { x:7.5, y:0, w:2.5, h:2.2, fill:{color:"1E3060"}, line:{color:"1E3060"} });
  txt(s,"CS Soft Solutions",0.42,0.72,9,0.55,{ fontSize:18, color:"8AACDA" });
  txt(s,"Global Oracle Practice",0.42,1.18,9,0.82,{ fontSize:52, bold:true, color:C.white, charSpacing:0.5 });
  txt(s,"Launch Plan",0.42,1.96,9,0.72,{ fontSize:48, bold:true, color:C.red });
  txt(s,"End-to-End GTM  ·  New Logo Acquisition Playbook  ·  Regional Execution  ·  24-Month Roadmap", 0.42,2.92,8.8,0.38,{ fontSize:13, color:"7A96BB", italic:true });
  var tags = ["BRM  Global #1 BSS", "OSM · UIM · ASAP  5G", "Siebel  2033 Runway"];
  var tagC = [C.red, "2C7BB6", C.amber];
  tags.forEach((t,i) => {
    var tx = 0.42 + i*3.05;
    s.addShape(pres.shapes.RECTANGLE, { x:tx, y:3.56, w:2.85, h:0.34, fill:{color:tagC[i]}, line:{color:tagC[i]} });
    txt(s, t, tx, 3.56, 2.85, 0.34, { fontSize:11, bold:true, color:C.white, align:"center", valign:"middle" });
  });
  var geos = ["🌏  APAC", "🌍  Middle East", "🌍  Africa", "🌎  Europe", "🌎  Americas"];
  txt(s, geos.join("   ·   "), 0.42, 4.12, 9, 0.28, { fontSize:10.5, color:"5A8ABB", align:"left" });
  txt(s,"Confidential  ·  June 2026",0.42,5.2,6,0.25,{ fontSize:9, color:"4A6280", italic:true });
})();

// ══════════════════════════════════════════════
// SLIDE 2 — GLOBAL OPPORTUNITY
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"The Global Oracle Services Opportunity");
  var stats = [
    { v:"$45B+",  l:"Global Oracle technology\nservices market (2025)" },
    { v:"350+",   l:"Operators worldwide\nrunning Oracle BRM" },
    { v:"5,000+", l:"Enterprises globally\nstill on Oracle Siebel" },
    { v:"$1.1T",  l:"Global 5G capex 2023-30\ndriving OSS demand" },
  ];
  stats.forEach((st,i) => {
    var x = 0.32 + i*2.38;
    card(s, x, 0.82, 2.22, 1.4, C.white);
    bigStat(s, st.v, st.l, x, 0.86, i===3 ? C.amber : C.red);
  });
  card(s,0.32,2.38,4.55,2.9,C.white);
  txt(s,"Why CS Soft — Right Now, Globally",0.52,2.50,4.15,0.30,{ fontSize:13, bold:true, color:C.navy });
  bullets(s,[
    "Oracle BRM runs billing for 350+ operators across 80+ countries — every 5G upgrade, migration and expansion is a services opportunity",
    "Accenture, IBM and Capgemini dominate Oracle delivery globally but carry 40-50% overhead — boutique specialists win on speed, depth and price",
    "Oracle's RODOD program actively funnels last-mile delivery to certified partners — CS Soft's niche depth is exactly what Oracle needs",
    "Siebel Premier Support extended to 2033: 5,000+ global enterprises face upgrade, migration or support renewal decisions — long revenue tail with scarce talent",
  ],0.52,2.88,4.15,2.28,10.5);
  card(s,5.13,2.38,4.55,2.9,C.navy);
  txt(s,"The CS Soft Global Edge",5.33,2.50,4.15,0.30,{ fontSize:13, bold:true, color:C.amber });
  s.addText([
    {text:"India delivery hub = 60-70% cost arbitrage vs Western SIs",options:{bullet:true,breakLine:true}},
    {text:"Niche BRM/OSS/Siebel depth — not commodity Oracle ERP",options:{bullet:true,breakLine:true}},
    {text:"Sub-vendor revenue from Month 3; direct logos from Month 6",options:{bullet:true,breakLine:true}},
    {text:"OPN partner co-sell: Oracle pushes deals to us, not just the other way",options:{bullet:true,breakLine:true}},
    {text:"Geographic sequence: India first, Middle East Month 4, APAC Month 8, Europe Month 12",options:{bullet:true,breakLine:false}},
  ],{ x:5.33, y:2.88, w:4.15, h:2.28, fontSize:10.5, color:"C8D8EE", fontFace:"Calibri", paraSpaceAfter:5, valign:"top" });
})();

// ══════════════════════════════════════════════
// SLIDE 3 — GEOGRAPHY PRIORITY MAP
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Geography Priority Matrix — Sequence of Market Entry");
  var geos = [
    { name:"India", priority:"WAVE 1  Month 0–6", color:C.red, rationale:"Delivery base · Largest sub-vendor opportunity · Fastest hiring · Telco BSS/OSS boom",
      keyAccounts:"Jio · Airtel · Vi · BSNL · Tata Comm · HDFC · ICICI", rates:"$35–65/hr (sub-vendor billing)", si:"TCS · Wipro · Infosys · TechM", flag:"🇮🇳" },
    { name:"Middle East", priority:"WAVE 2  Month 4–10", color:C.amber, rationale:"Highest bill rates globally · Vision 2030/UAE Agenda · BRM/OSS deeply embedded · Fast decisions",
      keyAccounts:"e& (Etisalat) · STC · Zain · Ooredoo · du · Batelco · Mobily", rates:"$120–180/hr direct", si:"Accenture · IBM · Capgemini ME", flag:"🇦🇪" },
    { name:"APAC", priority:"WAVE 2  Month 6–12", color:"2C7BB6", rationale:"Singtel/Telstra on BRM 12.x migration · APAC 5G fastest rollout · Strong Oracle partner ecosystem",
      keyAccounts:"Singtel · Telstra · Axiata · AIS · PCCW/HKT · Globe · XL Axiata", rates:"$90–140/hr direct", si:"Accenture APAC · Capgemini · NTT Data", flag:"🌏" },
    { name:"Europe", priority:"WAVE 3  Month 10–18", color:C.green, rationale:"BT/Vodafone/DT on Oracle BRM · Siebel BFSI deep base · Higher rates · longer sales cycles",
      keyAccounts:"BT Group · Vodafone · Deutsche Telekom · Orange · HSBC · Standard Chartered", rates:"$140–200/hr direct", si:"Accenture · IBM · CGI · Capgemini", flag:"🇪🇺" },
    { name:"Africa / LATAM", priority:"WAVE 3  Month 12–24", color:C.purple, rationale:"MTN/Airtel Africa on Oracle BRM · Claro/Telefónica OSS · Lower rates but fast-growing, underserved",
      keyAccounts:"MTN Group · Airtel Africa · Safaricom · América Móvil · Telefónica", rates:"$70–110/hr direct", si:"IBM · Accenture · local SIs", flag:"🌍" },
  ];
  geos.forEach((g,i) => {
    var row = Math.floor(i/3); var col = i%3;
    if(i<3) { var x=0.3+col*3.22; var y=0.82; var w=3.05; var h=4.52; }
    else     { var x=0.3+(i-3)*4.82; var y=0.82; var w=4.65; var h=4.52; }
    if(i===3){ x=0.30; w=4.65; }
    if(i===4){ x=5.05; w=4.65; }
    if(i<3){
      card(s, x, y, w, h, C.white, g.color);
      s.addShape(pres.shapes.RECTANGLE,{x,y,w,h:0.42,fill:{color:g.color},line:{color:g.color}});
      txt(s,g.flag+" "+g.name,x,y,w,0.42,{fontSize:13,bold:true,color:C.white,align:"center",valign:"middle"});
      s.addShape(pres.shapes.RECTANGLE,{x:x+0.1,y:y+0.48,w:w-0.2,h:0.24,fill:{color:g.color+"22"},line:{color:g.color}});
      txt(s,g.priority,x+0.1,y+0.48,w-0.2,0.24,{fontSize:8.5,bold:true,color:g.color,align:"center",valign:"middle"});
      txt(s,g.rationale,x+0.12,y+0.80,w-0.24,0.72,{fontSize:8.5,color:C.mid,wrap:true});
      txt(s,"KEY ACCOUNTS",x+0.12,y+1.58,w-0.24,0.20,{fontSize:7.5,bold:true,color:C.navy});
      txt(s,g.keyAccounts,x+0.12,y+1.80,w-0.24,0.60,{fontSize:9,color:C.dark,wrap:true});
      txt(s,"RATES",x+0.12,y+2.46,w-0.24,0.20,{fontSize:7.5,bold:true,color:C.navy});
      s.addShape(pres.shapes.RECTANGLE,{x:x+0.12,y:y+2.68,w:w-0.24,h:0.28,fill:{color:C.greenLt},line:{color:"A8D8BC"}});
      txt(s,g.rates,x+0.12,y+2.68,w-0.24,0.28,{fontSize:9.5,bold:true,color:C.green,align:"center",valign:"middle"});
      txt(s,"ENTRY VIA",x+0.12,y+3.04,w-0.24,0.20,{fontSize:7.5,bold:true,color:C.navy});
      txt(s,g.si,x+0.12,y+3.26,w-0.24,0.72,{fontSize:9,color:C.mid,wrap:true});
    } else {
      card(s, x, 3.5, w, 1.88, C.white, g.color);
      s.addShape(pres.shapes.RECTANGLE,{x,y:3.5,w,h:0.38,fill:{color:g.color},line:{color:g.color}});
      txt(s,g.flag+" "+g.name+"  —  "+g.priority,x,3.5,w,0.38,{fontSize:11,bold:true,color:C.white,valign:"middle",align:"center"});
      txt(s,g.rationale,x+0.12,3.96,w-0.24,0.50,{fontSize:9,color:C.dark,wrap:true});
      txt(s,g.keyAccounts+" | "+g.rates,x+0.12,4.50,w-0.24,0.28,{fontSize:8.5,color:C.mid,wrap:true});
    }
  });
})();

// ══════════════════════════════════════════════
// SLIDE 4 — TECHNOLOGY FOCUS (GLOBAL CONTEXT)
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Technology Focus — Deliberate Depth, Global Reach");
  var stacks = [
    { name:"Oracle BRM", pct:"40%", color:C.red,
      why:"#1 global BSS platform · 350+ operators · Highest demand · Best rates · BRM 12.x migration wave active globally",
      skills:"BRM 12.x Core Engine · Elastic Charging Engine (ECE) · Pipeline Manager · Balance Management · BRM-OCS Integration · BRM on OCI Cloud · Mediation · Self-Care Portal",
      globalPresence:"Americas: AT&T, Bell Canada, Claro\nEurope: BT, Vodafone, DT\nME: e&, STC, Zain, Ooredoo\nAPAC: Singtel, Telstra, Axiata",
      rate:"$110–220/hr (global) · ₹3,500–5,500/hr (India sub-vnd)" },
    { name:"Oracle OSS Suite", pct:"35%", color:"2C7BB6",
      why:"5G driving massive OSS upgrades globally · Scarcest talent = highest rates · Long-duration programs 18-36mo",
      skills:"OSM (Order & Service Mgmt) · UIM (Unified Inventory) · ASAP Activation · OCSM · Network Design & Analysis · MSO · 5G NR inventory modelling",
      globalPresence:"APAC: Singtel, Telstra, Globe\nME: STC, Ooredoo, du\nEurope: BT, Orange\nIndia: Jio, Airtel, BSNL",
      rate:"$130–250/hr (global) · ₹4,000–6,500/hr (India)" },
    { name:"Oracle Siebel CRM", pct:"25%", color:C.amber,
      why:"5,000+ global enterprises · Extended to 2033 · Architects retiring = scarcity premium · Fusion CX migration projects",
      skills:"Siebel 8.x/IP19/IP20 · Open UI · EIM/EAI · CTI · Siebel Analytics · Fusion CX Migration Roadmap · Siebel REST integration",
      globalPresence:"Europe: HSBC, Standard Chartered, BT\nAmericas: AT&T, insurance firms\nME: Emirates NBD, FAB, QNB\nAPAC: ANZ, OCBC, DBS",
      rate:"$100–200/hr (global) · ₹2,500–4,500/hr (India)" },
  ];
  stacks.forEach((st,i) => {
    var x=0.3+i*3.17;
    card(s,x,0.82,3.0,4.58,C.white,st.color);
    s.addShape(pres.shapes.RECTANGLE,{x,y:0.82,w:3.0,h:0.42,fill:{color:st.color},line:{color:st.color}});
    txt(s,st.name,x,0.82,3.0,0.42,{fontSize:13,bold:true,color:C.white,align:"center",valign:"middle"});
    txt(s,st.pct,x,1.26,3.0,0.62,{fontSize:40,bold:true,color:st.color,align:"center",valign:"middle"});
    txt(s,"focus weightage",x,1.86,3.0,0.18,{fontSize:8.5,color:C.muted,align:"center"});
    s.addShape(pres.shapes.RECTANGLE,{x:x+0.1,y:2.10,w:2.8,h:0.24,fill:{color:C.lightBg},line:{color:"D0DBF0"}});
    txt(s,"WHY  "+st.why,x+0.14,2.10,2.72,0.24,{fontSize:7.5,color:C.mid,valign:"middle"});
    txt(s,"KEY SKILLS",x+0.1,2.40,2.8,0.20,{fontSize:7.5,bold:true,color:C.navy});
    txt(s,st.skills,x+0.1,2.62,2.8,0.82,{fontSize:9,color:C.dark,wrap:true});
    txt(s,"GLOBAL CLIENT BASE",x+0.1,3.50,2.8,0.20,{fontSize:7.5,bold:true,color:C.navy});
    txt(s,st.globalPresence,x+0.1,3.72,2.8,0.72,{fontSize:8.5,color:C.mid,wrap:true});
    s.addShape(pres.shapes.RECTANGLE,{x:x+0.1,y:4.48,w:2.8,h:0.30,fill:{color:C.greenLt},line:{color:"A8D8BC"}});
    txt(s,st.rate,x+0.1,4.48,2.8,0.30,{fontSize:8.5,bold:true,color:C.green,align:"center",valign:"middle"});
  });
})();

// ══════════════════════════════════════════════
// SLIDE 5 — SIX GLOBAL MARKET TAILWINDS
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Six Global Market Tailwinds — Why the Timing Is Perfect");
  var winds = [
    {icon:"5G",title:"Global 5G Rollout — $1.1T Capex Through 2030",
     body:"Every major operator globally is mid-build on 5G. Network inventory (UIM), order orchestration (OSM) and activation (ASAP) all require upgrade or greenfield deployment. Jio, STC, e&, Singtel, Telstra — all active NOW. This is a 5-7 year runway."},
    {icon:"BRM\n12x",title:"BRM 7.x/11.x End of Primary Support — Global Migration Wave",
     body:"Oracle's EoL announcement forces 200+ operators to migrate to BRM 12.x. Each migration is 18-36 months, $5-40M programme size. Active migrations: Telstra (AU), STC (KSA), Airtel (IN), Singtel (SG), BT (UK). CS Soft gets in as sub-vendor on any of these."},
    {icon:"2033",title:"Siebel Extended to 2033 — Long Tail Across 5,000 Enterprises",
     body:"5,000+ enterprises globally are on Siebel with no plans to exit. HSBC, Standard Chartered, ANZ, Emirates NBD, AT&T — all running Siebel for contact centre, collections, field service. Senior architects are retiring. Scarcity premium is 30-40% above Salesforce rates."},
    {icon:"OCI",title:"Oracle Cloud Infrastructure (OCI) Push — Lift BRM/Siebel to Cloud",
     body:"Oracle is aggressively pushing customers to run BRM and Siebel on OCI. Every on-premise customer is a cloud migration opportunity. Oracle co-sells OCI licences + RODOD partner delivers — CS Soft earns on both the services and licence margin."},
    {icon:"GAP",title:"Global Talent Shortage — 2,000 Senior Consultants Worldwide",
     body:"Fewer than 2,000 truly senior BRM/OSM/UIM/Siebel consultants exist globally. Demand is growing 20%+ YoY as 5G and migrations accelerate. Bill rates rose 18-25% YoY in 2024 across Middle East and APAC. This shortage makes CS Soft's delivery hub model uniquely profitable."},
    {icon:"OPN",title:"Oracle RODOD / OPN — Oracle Sells Deals, Partners Deliver",
     body:"Oracle's sales team has revenue targets but limited delivery capacity. OPN Gold RODOD partners get deal registrations, co-sell motions, and Oracle-sourced leads. Oracle's Alliance Managers are incentivised to bring CS Soft into RFPs. One strong relationship = 3-5 deals/year."},
  ];
  winds.forEach((w,i) => {
    var col=i%2; var row=Math.floor(i/2);
    var x=col===0?0.3:5.15; var y=0.82+row*1.58;
    card(s,x,y,4.6,1.45,C.white);
    s.addShape(pres.shapes.RECTANGLE,{x,y,w:0.50,h:1.45,fill:{color:C.red},line:{color:C.red}});
    txt(s,w.icon,x,y+0.38,0.50,0.70,{fontSize:8.5,bold:true,color:C.white,align:"center",valign:"middle"});
    txt(s,w.title,x+0.60,y+0.08,3.88,0.30,{fontSize:10.5,bold:true,color:C.navy});
    txt(s,w.body,x+0.60,y+0.42,3.88,0.96,{fontSize:8.5,color:C.mid,wrap:true});
  });
})();

// ══════════════════════════════════════════════
// SLIDE 6 — PRACTICE LAUNCH MODEL
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.navy);
  txt(s,"Practice Launch Model — 4 Phases, 24 Months",0.38,0.12,9.5,0.55,{fontSize:22,bold:true,color:C.white});
  txt(s,"India delivery hub → Middle East & APAC direct logos → Europe expansion → Full global practice at $12-18M ARR",0.38,0.62,9.5,0.28,{fontSize:11.5,color:"7A96BB",italic:true});
  var phases = [
    {num:"01",name:"Foundation",      dur:"Month 0–3",   color:C.amber,   head:"5–7 hires",    rev:"$0",           note:"Build & Register"},
    {num:"02",name:"First Revenue",   dur:"Month 3–6",   color:"2C9A5A",  head:"8–12 total",   rev:"$80–150K/mo",  note:"Sub-vendor + India"},
    {num:"03",name:"Global Scale",    dur:"Month 6–18",  color:"2C7BB6",  head:"18–28 total",  rev:"$350–700K/mo", note:"ME + APAC Logos"},
    {num:"04",name:"Full Practice",   dur:"Month 18–24", color:C.red,     head:"35–50 total",  rev:"$1M+/mo",      note:"Direct + Managed Svc"},
  ];
  phases.forEach((p,i) => {
    var x=0.28+i*2.38;
    s.addShape(pres.shapes.RECTANGLE,{x,y:1.08,w:2.22,h:4.22,fill:{color:"1E3060"},line:{color:p.color,width:2}});
    txt(s,p.num,x,1.16,2.22,0.70,{fontSize:48,bold:true,color:p.color,align:"center"});
    txt(s,p.name,x,1.80,2.22,0.36,{fontSize:13,bold:true,color:C.white,align:"center"});
    txt(s,p.dur,x,2.18,2.22,0.26,{fontSize:9.5,color:"7A96BB",align:"center"});
    s.addShape(pres.shapes.RECTANGLE,{x:x+0.2,y:2.50,w:1.82,h:0.02,fill:{color:p.color},line:{color:p.color}});
    txt(s,"HEADCOUNT",x+0.1,2.60,2.02,0.20,{fontSize:8,color:"7A96BB",align:"center"});
    txt(s,p.head,x,2.80,2.22,0.38,{fontSize:19,bold:true,color:C.white,align:"center"});
    txt(s,"MONTHLY REVENUE",x+0.1,3.30,2.02,0.20,{fontSize:8,color:"7A96BB",align:"center"});
    txt(s,p.rev,x,3.52,2.22,0.48,{fontSize:16,bold:true,color:p.color,align:"center"});
    s.addShape(pres.shapes.RECTANGLE,{x:x+0.1,y:4.20,w:2.02,h:0.28,fill:{color:p.color},line:{color:p.color}});
    txt(s,p.note,x+0.1,4.20,2.02,0.28,{fontSize:9,bold:true,color:C.navy,align:"center",valign:"middle"});
  });
  [0,1,2].forEach(i => { var ax=0.28+i*2.38+2.22; txt(s,"→",ax,2.58,0.16,0.38,{fontSize:20,bold:true,color:"4A6A9A",align:"center"}); });
})();

// ══════════════════════════════════════════════
// SLIDE 7 — NEW LOGO ACQUISITION PLAYBOOK
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.navy);
  txt(s,"New Logo Acquisition Playbook",0.38,0.08,9.5,0.58,{fontSize:23,bold:true,color:C.white});
  txt(s,"Five parallel motions running simultaneously — each produces logos on a different timeline",0.38,0.60,9.5,0.28,{fontSize:11.5,color:"7A96BB",italic:true});
  var motions = [
    {num:"01",name:"Oracle OPN Co-sell",timeline:"Month 3–8",color:C.amber,
     how:"Register OPN → Oracle Alliance Manager brings CS Soft into live RFPs as preferred delivery partner. Oracle's sales team is incentivised to close deals faster with a delivery partner pre-attached. Target: 1 co-sell logo per quarter from Month 6.",
     tactic:"Get OPN Silver Day 1 · Request Alliance Manager intro Week 2 · Attend every Oracle sales call you are invited to · Co-bid on 2+ RFPs per quarter"},
    {num:"02",name:"SI Sub-vendor → Direct",timeline:"Month 3–12",color:"2C9A5A",
     how:"Enter account as sub-vendor via TCS/Wipro/Accenture. Build relationship with end-client's Oracle technical team. At contract renewal (typically 12-18 months), present direct MSA at 15-20% lower total cost. Conversion rate: 1 in 3 sub-vendor accounts becomes direct.",
     tactic:"Submit profiles Week 3 · Place resource at client site · CS Soft resource wears client badge but builds CS Soft relationships · Identify renewal date Day 1 of engagement"},
    {num:"03",name:"Event & Conference ABM",timeline:"Month 4–12",color:"2C7BB6",
     how:"Oracle CloudWorld (Oct, Las Vegas), TM Forum DTW (Jun, Copenhagen), GITEX (Oct, Dubai), Oracle OCP Summit (India), Gartner IT Summit ME. Each event = 50+ qualified conversations. Budget $15K/event, expect 3-5 pipeline deals per major event.",
     tactic:"Identify 30 target attendees pre-event · LinkedIn connect 2 weeks prior · Book 10 meetings pre-event · Follow up within 48 hours · One deal from every major event is the KPI"},
    {num:"04",name:"LinkedIn Account-Based Outreach",timeline:"Month 1 ongoing",color:C.purple,
     how:"Target IT Director / VP Technology / CTO at 50 named accounts. Personalised InMail referencing their specific Oracle stack and current challenge (e.g. 'I saw STC announced BRM migration — we've done 4 of these'). 2x content posts/week on LinkedIn. 20 outreaches/week = 2-3 meetings/month = 1 proposal/month.",
     tactic:"Build ICP list of 200 contacts in Week 1 · Hire 1 SDR in Month 2 · Track in CRM · 90-day nurture cadence · Offer free BRM health check as conversation starter"},
    {num:"05",name:"Oracle RFP Deal Registration",timeline:"Month 4 ongoing",color:C.red,
     how:"OPN deal registration gives CS Soft a 5-10% price advantage on Oracle license components in joint bids. Subscribe to Tendersinfo, BidNet, GovHK, OJEU for global Oracle-tagged tenders. Respond to 2 RFPs per month minimum. Win rate target: 1 in 5 from Month 6.",
     tactic:"Assign RFP lead in Month 2 · Create modular proposal library (BRM, OSS, Siebel) · Register every deal with Oracle before responding · Include Oracle reference architecture in every bid"},
  ];
  motions.forEach((m,i) => {
    var col=i%2===0; var x=col?0.28:5.14; var y=1.0+Math.floor(i/2)*1.52;
    if(i===4){x=0.28; var ww=9.44;}else{var ww=4.62;}
    s.addShape(pres.shapes.RECTANGLE,{x,y,w:ww,h:1.40,fill:{color:"1E3060"},line:{color:m.color,width:1.5}});
    txt(s,m.num,x+0.10,y+0.08,0.52,0.52,{fontSize:28,bold:true,color:m.color});
    txt(s,m.name,x+0.68,y+0.08,ww-1.0,0.28,{fontSize:11,bold:true,color:C.white});
    s.addShape(pres.shapes.RECTANGLE,{x:x+0.68,y:y+0.38,w:1.1,h:0.20,fill:{color:m.color},line:{color:m.color}});
    txt(s,m.timeline,x+0.68,y+0.38,1.1,0.20,{fontSize:7.5,bold:true,color:C.navy,align:"center",valign:"middle"});
    txt(s,m.tactic,x+1.86,y+0.38,ww-2.18,0.22,{fontSize:8.5,color:C.amber,bold:true,wrap:true,valign:"middle"});
    txt(s,m.how,x+0.68,y+0.62,ww-1.00,0.70,{fontSize:8.5,color:"A8C0DC",wrap:true});
  });
})();

// ══════════════════════════════════════════════
// SLIDE 8 — NAMED ACCOUNT BOARD TIER 1
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Named Account Target Board — Priority Tier 1: Month 1–8 Logos");
  sectionTag(s,"NEW LOGO HUNT",0.38,0.78,C.red);
  var hdr = {fill:{color:C.navy},color:C.white,bold:true,align:"center"};
  var hdrL = {fill:{color:C.navy},color:C.white,bold:true};
  var rows = [
    [{text:"Account",options:hdrL},{text:"Geo",options:hdr},{text:"Stack",options:hdr},{text:"Entry Motion",options:hdr},{text:"Named Contact Title",options:hdr},{text:"Target Month",options:hdr},{text:"Est. Deal",options:hdr}],
    [{text:"e& (Etisalat Group)",options:{bold:true}},{text:"UAE",options:{align:"center"}},{text:"BRM · OSM",options:{bold:true,color:C.red,align:"center"}},
     "OPN co-sell + Accenture ME sub-vnd","VP IT / Oracle CoE Head",{text:"Month 4–6",options:{bold:true,color:C.red,align:"center"}},{text:"$1.5–3M",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"STC (Saudi Telecom)",options:{bold:true}},{text:"KSA",options:{align:"center"}},{text:"BRM 12.x",options:{bold:true,color:C.red,align:"center"}},
     "Oracle Alliance intro + GITEX follow-up","Director BSS / CIO Oracle Programs",{text:"Month 4–7",options:{bold:true,color:C.red,align:"center"}},{text:"$2–5M",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"Singtel",options:{bold:true}},{text:"SGP",options:{align:"center"}},{text:"BRM · ASAP",options:{bold:true,color:C.red,align:"center"}},
     "Accenture APAC sub-vnd → direct","Head of BSS Architecture",{text:"Month 6–9",options:{bold:true,color:C.amber,align:"center"}},{text:"$1–2.5M",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"Telstra",options:{bold:true}},{text:"AUS",options:{align:"center"}},{text:"BRM 12.x",options:{bold:true,color:C.red,align:"center"}},
     "Oracle OPN co-sell (Telstra BRM migration live)","GM Billing Modernisation",{text:"Month 5–8",options:{bold:true,color:C.amber,align:"center"}},{text:"$2–4M",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"Zain Group",options:{bold:true}},{text:"KWT/KSA",options:{align:"center"}},{text:"BRM · OSM",options:{bold:true,color:C.red,align:"center"}},
     "LinkedIn ABM + Oracle Alliance KSA","VP Technology / BSS Head",{text:"Month 5–8",options:{bold:true,color:C.amber,align:"center"}},{text:"$1–2M",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"Airtel (Direct)",options:{bold:true}},{text:"IND",options:{align:"center"}},{text:"BRM · ASAP",options:{bold:true,color:C.red,align:"center"}},
     "Convert from TCS/Wipro sub-vendor to direct MSA","Head Oracle CoE / VP IT","Month 6–9",{text:"₹20–50Cr",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"HSBC",options:{bold:true}},{text:"UK/APAC",options:{align:"center"}},{text:"Siebel CRM",options:{bold:true,color:C.amber,align:"center"}},
     "IBM/Capgemini sub-vnd · RFP response","Head of CRM Architecture",{text:"Month 6–9",options:{bold:true,color:C.amber,align:"center"}},{text:"$800K–1.5M",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"Ooredoo Group",options:{bold:true}},{text:"QAT",options:{align:"center"}},{text:"BRM · UIM",options:{bold:true,color:C.red,align:"center"}},
     "OPN deal registration + Oracle QAT team intro","CIO / Oracle Programme Head",{text:"Month 6–10",options:{bold:true,color:C.amber,align:"center"}},{text:"$1–2M",options:{bold:true,color:C.green,align:"center"}}],
  ];
  s.addTable(rows,{
    x:0.3,y:0.9,w:9.4,h:4.68,
    colW:[1.75,0.55,1.0,2.1,1.6,1.0,0.9],
    border:{pt:0.5,color:"E0E8F0"},
    fontFace:"Calibri",fontSize:9.5,
    valign:"middle",rowH:0.46,
  });
  txt(s,"Entry motion = the specific first-contact play. Named contact title = who to reach. Est. Deal = anticipated Year-1 services value.",0.3,5.52,9.4,0.22,{fontSize:8,color:C.muted,italic:true});
})();

// ══════════════════════════════════════════════
// SLIDE 9 — NAMED ACCOUNT BOARD TIER 2
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Named Account Target Board — Tier 2: Month 8–18 Logo Pipeline");
  sectionTag(s,"NEW LOGO PIPELINE",0.38,0.78,C.steel);
  var hdr = {fill:{color:C.steel},color:C.white,bold:true,align:"center"};
  var hdrL = {fill:{color:C.steel},color:C.white,bold:true};
  var rows = [
    [{text:"Account",options:hdrL},{text:"Geo",options:hdr},{text:"Stack",options:hdr},{text:"Entry Motion",options:hdr},{text:"Oracle Dependency",options:hdr},{text:"Target Month",options:hdr},{text:"Est. Deal",options:hdr}],
    ["BT Group",{text:"UK",options:{align:"center"}},{text:"BRM · Siebel",options:{bold:true,color:C.red,align:"center"}},
     "Capgemini/IBM sub-vnd; Oracle UK Alliance","BRM for wholesale billing; Siebel contact centre",{text:"Month 9–13",options:{align:"center"}},{text:"$1.5–3M",options:{bold:true,color:C.green,align:"center"}}],
    ["Deutsche Telekom",{text:"DE",options:{align:"center"}},{text:"BRM · OSM",options:{bold:true,color:C.red,align:"center"}},
     "Oracle Germany Alliance + CGI sub-vnd","BRM 12.x upgrade active; OSM 5G SA rollout",{text:"Month 10–14",options:{align:"center"}},{text:"$2–4M",options:{bold:true,color:C.green,align:"center"}}],
    ["Standard Chartered",{text:"UK/SG",options:{align:"center"}},{text:"Siebel CRM",options:{bold:true,color:C.amber,align:"center"}},
     "LinkedIn ABM: Head of CRM Technology","Siebel for corporate banking & trade finance",{text:"Month 9–12",options:{align:"center"}},{text:"$1–2.5M",options:{bold:true,color:C.green,align:"center"}}],
    ["MTN Group",{text:"ZAF",options:{align:"center"}},{text:"BRM · ASAP",options:{bold:true,color:C.red,align:"center"}},
     "Oracle Africa Alliance; IBM SA sub-vnd","BRM multi-country billing; 5G ASAP activation",{text:"Month 10–15",options:{align:"center"}},{text:"$1–2M",options:{bold:true,color:C.green,align:"center"}}],
    ["Axiata Group",{text:"MYS",options:{align:"center"}},{text:"BRM · OSM",options:{bold:true,color:C.red,align:"center"}},
     "Accenture APAC sub-vnd → direct","BRM across 10 OpCos; OSM transformation",{text:"Month 9–14",options:{align:"center"}},{text:"$1.5–3M",options:{bold:true,color:C.green,align:"center"}}],
    ["Emirates NBD",{text:"UAE",options:{align:"center"}},{text:"Siebel CRM",options:{bold:true,color:C.amber,align:"center"}},
     "Accenture ME sub-vnd; GITEX connection","Siebel for retail banking; Fusion CX migration eval",{text:"Month 8–12",options:{align:"center"}},{text:"$800K–1.5M",options:{bold:true,color:C.green,align:"center"}}],
    ["Globe Telecom",{text:"PHL",options:{align:"center"}},{text:"BRM · UIM",options:{bold:true,color:C.red,align:"center"}},
     "Oracle Philippines Alliance intro","BRM for postpaid; UIM 5G island network",{text:"Month 10–14",options:{align:"center"}},{text:"$800K–1.5M",options:{bold:true,color:C.green,align:"center"}}],
    ["América Móvil / Claro",{text:"MEX",options:{align:"center"}},{text:"BRM",options:{bold:true,color:C.red,align:"center"}},
     "Oracle LATAM Alliance; IBM LATAM sub-vnd","BRM for 18-country prepaid/postpaid billing",{text:"Month 12–18",options:{align:"center"}},{text:"$2–4M",options:{bold:true,color:C.green,align:"center"}}],
  ];
  s.addTable(rows,{
    x:0.3,y:0.9,w:9.4,h:4.68,
    colW:[1.65,0.52,1.05,2.2,1.72,0.98,0.88],
    border:{pt:0.5,color:"D8E4F0"},
    fontFace:"Calibri",fontSize:9.5,
    valign:"middle",rowH:0.46,
  });
  txt(s,"Pipeline total Tier 1+2: 17 named accounts · Estimated pipeline value: $18–38M over 24 months · Win 5 = Year 2 target achieved",0.3,5.52,9.4,0.22,{fontSize:8.5,bold:true,color:C.navy,italic:true});
})();

// ══════════════════════════════════════════════
// SLIDE 10 — GLOBAL SI ECOSYSTEM
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Global Sub-vendor & SI Ecosystem — Who to Partner, How to Enter");
  sectionTag(s,"DEPLOYMENT PARTNERS",0.38,0.78);
  txt(s,"Sub-contracting to global SIs is the fastest path to revenue (Month 3) and first-logo relationships. Target 6 primes across 3 tiers.",0.38,0.90,9.3,0.26,{fontSize:10.5,color:C.mid,italic:true});
  var sis=[
    {name:"Accenture",geo:"Global",focus:"BRM · OSM · Siebel",entry:"Oracle Alliance Global via OPN. Accenture Oracle CoE has chronic BRM/OSM talent shortfall. Target Oracle Lead at Accenture London / Dubai / Singapore — chronic sub-vnd need for e&, BT, Singtel projects.",proj:"e&, BT, STC, Singtel, HSBC",status:"PRIORITY 1"},
    {name:"IBM Consulting",geo:"Global",focus:"BRM · Siebel",entry:"IBM Supplier Portal (ibm.com/procurement). IBM GBS Oracle practice sub-contracts niche Oracle work for BFSI and government accounts in ME and EU. Warm intro via Oracle Alliance preferred.",proj:"MTN, Standard Chartered, DT",status:"PRIORITY 1"},
    {name:"Capgemini",geo:"EU/ME/APAC",focus:"BRM · OSM · Siebel",entry:"Capgemini Telecom, Media & Technology practice. Oracle Alliance events in London/Paris. Capgemini ME (Dubai) is smaller, more approachable — start there for ME account entry.",proj:"Orange, BT, DT, Ooredoo",status:"PRIORITY 1"},
    {name:"CGI Group",geo:"Europe/Canada",focus:"BRM · Siebel",entry:"CGI Oracle practice UK and Canada. Smaller than Big 3 — faster MSA. CGI UK Oracle Practice Director contactable directly via LinkedIn. Also CGI Canada for Bell Canada access.",proj:"BT, Bell Canada, UK Siebel",status:"PRIORITY 2"},
    {name:"DXC Technology",geo:"Global",focus:"Siebel · BRM",entry:"DXC has one of the world's largest Siebel support bases (HP/CSC legacy). Always needs Siebel resources on short notice. Contact DXC Oracle CoE Sydney / London directly.",proj:"ANZ, insurance Siebel, AT&T",status:"PRIORITY 2"},
    {name:"TCS · Wipro · Infosys",geo:"India + Global",focus:"BRM · OSM · Siebel",entry:"India entry via supplier portals (supplier.tcs.com, Wipro PVMS). Also approach global Oracle CoEs for APAC and ME projects. Fastest MSA — start here Month 1.",proj:"All Indian telcos + global via CoE",status:"PRIORITY 1"},
  ];
  sis.forEach((si,i)=>{
    var y=1.26+i*0.70;
    s.addShape(pres.shapes.RECTANGLE,{x:0.3,y,w:9.4,h:0.62,fill:{color:i%2===0?C.white:C.lightBg},line:{color:"D8E4F0",width:0.5}});
    s.addShape(pres.shapes.RECTANGLE,{x:0.3,y:y+0.08,w:1.02,h:0.46,fill:{color:C.navy},line:{color:C.navy}});
    txt(s,si.name,0.3,y+0.08,1.02,0.46,{fontSize:9.5,bold:true,color:C.white,align:"center",valign:"middle"});
    s.addShape(pres.shapes.RECTANGLE,{x:1.38,y:y+0.08,w:0.58,h:0.22,fill:{color:C.steel},line:{color:C.steel}});
    txt(s,si.geo,1.38,y+0.08,0.58,0.22,{fontSize:7,bold:true,color:C.white,align:"center",valign:"middle"});
    txt(s,si.focus,2.02,y+0.06,1.1,0.22,{fontSize:9,bold:true,color:C.red});
    txt(s,si.entry,1.38,y+0.33,4.28,0.24,{fontSize:8.5,color:C.mid,italic:true,wrap:true});
    txt(s,"Proj: "+si.proj,5.74,y+0.06,2.82,0.24,{fontSize:8.5,color:C.dark});
    var sc=si.status==="PRIORITY 1"?C.red:C.amber;
    s.addShape(pres.shapes.RECTANGLE,{x:8.62,y:y+0.14,w:1.02,h:0.28,fill:{color:sc},line:{color:sc}});
    txt(s,si.status,8.62,y+0.14,1.02,0.28,{fontSize:7,bold:true,color:C.white,align:"center",valign:"middle"});
  });
  s.addShape(pres.shapes.RECTANGLE,{x:0,y:5.28,w:10,h:0.35,fill:{color:C.navy},line:{color:C.navy}});
  txt(s,"Pro tip: Get one BRM resource placed inside Accenture's e& or STC project — in 6 months you know the client's Oracle team better than Accenture does.",0.38,5.28,9.24,0.35,{fontSize:10,color:C.amber,bold:true,valign:"middle"});
})();

// ══════════════════════════════════════════════
// SLIDE 11 — MIDDLE EAST GTM
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Middle East GTM — Wave 2 (Month 4–10): Highest Global Bill Rates",C.amber,C.dark);
  sectionTag(s,"MIDDLE EAST",0.38,0.78,C.amber);
  txt(s,"ME telcos pay $130–180/hr for Oracle BRM/OSS — the highest rates globally. Decisions are fast. e&, STC, Zain, Ooredoo are all on Oracle. This is CS Soft's first international priority.",0.38,0.90,9.3,0.26,{fontSize:10.5,color:C.mid,italic:true});
  card(s,0.3,1.22,4.6,1.90,C.white);
  txt(s,"Top 6 ME Target Accounts",0.5,1.32,4.2,0.26,{fontSize:12,bold:true,color:C.navy});
  var meAcc=[{n:"e& (Etisalat Group)",c:"UAE",s:"BRM · OSM · UIM",r:"$150–180/hr"},{n:"STC (Saudi Telecom)",c:"KSA",s:"BRM 12.x Migration",r:"$140–170/hr"},{n:"Zain Group",c:"KWT/KSA/AFR",s:"BRM · ASAP",r:"$120–150/hr"},{n:"Ooredoo",c:"QAT",s:"BRM · UIM",r:"$130–160/hr"},{n:"du (EITC)",c:"UAE",s:"OSM · ASAP",r:"$130–155/hr"},{n:"Mobily",c:"KSA",s:"BRM Core",r:"$120–145/hr"}];
  meAcc.forEach((a,i)=>{
    var y=1.64+i*0.24;
    s.addShape(pres.shapes.RECTANGLE,{x:0.38,y,w:4.42,h:0.22,fill:{color:i%2===0?C.lightBg:C.white},line:{color:"E0EAF4",width:0.5}});
    txt(s,a.n,0.44,y+0.02,1.52,0.18,{fontSize:9,bold:true,color:C.dark});
    txt(s,a.c,2.0,y+0.02,0.7,0.18,{fontSize:8.5,color:C.muted,align:"center"});
    txt(s,a.s,2.74,y+0.02,1.08,0.18,{fontSize:8.5,bold:true,color:C.red});
    txt(s,a.r,3.86,y+0.02,0.86,0.18,{fontSize:8.5,bold:true,color:C.green,align:"right"});
  });
  card(s,5.1,1.22,4.6,1.90,C.navy);
  txt(s,"Market Entry Sequence",5.30,1.32,4.2,0.26,{fontSize:12,bold:true,color:C.amber});
  s.addText([
    {text:"Month 4: Attend GITEX Dubai — meet e& and STC Oracle IT leads",options:{bullet:true,breakLine:true}},
    {text:"Month 4: Oracle UAE/KSA Alliance Manager intro via OPN",options:{bullet:true,breakLine:true}},
    {text:"Month 5: Accenture ME vendor portal registration (Dubai)",options:{bullet:true,breakLine:true}},
    {text:"Month 5: LinkedIn ABM — 30 ME telco IT contacts targeted",options:{bullet:true,breakLine:true}},
    {text:"Month 6: Submit profiles to Accenture ME Oracle projects",options:{bullet:true,breakLine:true}},
    {text:"Month 8: First direct CS Soft meeting at ME telco",options:{bullet:true,breakLine:false}},
  ],{x:5.30,y:1.62,w:4.22,h:1.44,fontSize:9.5,color:"C8D8EE",fontFace:"Calibri",paraSpaceAfter:4,valign:"top"});
  card(s,0.3,3.22,9.4,2.10,C.white);
  txt(s,"ME-Specific Execution Tactics",0.5,3.32,9.0,0.26,{fontSize:12,bold:true,color:C.navy});
  var meTactics=[
    {t:"GITEX Global (Oct, Dubai)",d:"Largest ME tech event. Pre-schedule 10 meetings. $10K investment → 5-8 ME pipeline conversations. Non-negotiable for ME GTM."},
    {t:"Oracle ME Alliance",d:"Oracle UAE and KSA have dedicated telco Alliance Managers. Get on 'preferred delivery partner' list. They bring RFPs. Attend every Oracle ME event."},
    {t:"Arabic Capability Deck",d:"2-page Arabic version of CS Soft brochure. ME telco IT leadership prefers Arabic materials. Shows cultural commitment — differentiates from Western SIs."},
    {t:"Dubai/ADGM Entity",d:"Register Dubai DIFC or ADGM free zone (~AED 12K). Required for direct contracts with UAE entities and ME telcos. Do in Month 6 when first ME pipeline is live."},
  ];
  meTactics.forEach((t,i)=>{
    var x=0.42+i*2.36;
    s.addShape(pres.shapes.RECTANGLE,{x,y:3.64,w:2.22,h:1.56,fill:{color:i%2===0?C.steelLt:C.amberLt},line:{color:"D0DBF0"}});
    txt(s,t.t,x+0.1,3.72,2.02,0.30,{fontSize:9.5,bold:true,color:C.navy,wrap:true});
    txt(s,t.d,x+0.1,4.06,2.02,1.08,{fontSize:8.5,color:C.dark,wrap:true});
  });
})();

// ══════════════════════════════════════════════
// SLIDE 12 — APAC GTM
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"APAC GTM — Wave 2 (Month 6–12): Singtel, Telstra, Axiata","2C4A7C");
  sectionTag(s,"APAC",0.38,0.78,"2C7BB6");
  txt(s,"APAC is the world's fastest 5G growth region. Singtel and Telstra are mid-BRM 12.x migration. India time zones align perfectly. Sub-vendor entry via Accenture APAC; direct from Month 10.",0.38,0.90,9.3,0.26,{fontSize:10.5,color:C.mid,italic:true});
  var apacAcc=[{n:"Singtel",c:"SGP",s:"BRM · ASAP",status:"BRM 12.x upgrade funded",entry:"Accenture SG → direct",r:"$120–145/hr"},{n:"Telstra",c:"AUS",s:"BRM 12.x",status:"Active migration",entry:"Oracle OPN co-sell",r:"$130–160/hr"},{n:"Axiata Group",c:"MYS",s:"BRM · OSM",status:"Multi-OpCo BRM consolidation",entry:"Accenture KL sub-vnd",r:"$90–115/hr"},{n:"Globe Telecom",c:"PHL",s:"BRM · UIM",status:"5G UIM build active",entry:"Oracle PH Alliance",r:"$85–110/hr"},{n:"AIS / True Corp",c:"THA",s:"OSM · ASAP",status:"5G OSS transformation",entry:"LinkedIn ABM",r:"$80–105/hr"},{n:"PCCW/HKT",c:"HKG",s:"Siebel · BRM",status:"Siebel support + BRM OpEx",entry:"DXC sub-vnd",r:"$100–130/hr"}];
  var hr2={fill:{color:"2C4A7C"},color:C.white,bold:true,align:"center"};
  var hr2L={fill:{color:"2C4A7C"},color:C.white,bold:true};
  var rows=[[{text:"Account",options:hr2L},{text:"Country",options:hr2},{text:"Stack",options:hr2},{text:"Status",options:hr2},{text:"Entry Motion",options:hr2},{text:"Bill Rate",options:hr2}]];
  apacAcc.forEach(a=>{ rows.push([{text:a.n,options:{bold:true}},{text:a.c,options:{align:"center"}},{text:a.s,options:{bold:true,color:"2C4A7C",align:"center"}},a.status,a.entry,{text:a.r,options:{bold:true,color:C.green,align:"center"}}]); });
  s.addTable(rows,{x:0.3,y:1.08,w:9.4,h:2.08,colW:[1.30,0.72,1.05,2.10,2.68,1.55],border:{pt:0.5,color:"D0DBF0"},fontFace:"Calibri",fontSize:10,valign:"middle",rowH:0.30});
  card(s,0.3,3.30,4.6,2.02,C.white);
  txt(s,"APAC Entry Playbook",0.5,3.40,4.2,0.26,{fontSize:12,bold:true,color:C.navy});
  bullets(s,["Month 6: Oracle APAC Alliance intro via OPN — Singapore Alliance Manager","Month 6: Register on Accenture APAC Supplier Portal (Singapore HQ)","Month 7: Attend Oracle CloudWorld APAC or TM Forum APAC Singapore","Month 8: Submit BRM/OSM profiles to Accenture SG for Singtel/Axiata","Month 9: LinkedIn ABM — 40 APAC telco IT leaders, personalised outreach","Month 10: First CS Soft direct meeting with Singtel or Telstra Oracle team"],0.5,3.74,4.22,1.50,9.5);
  card(s,5.1,3.30,4.6,2.02,C.navy);
  txt(s,"Why APAC Works for CS Soft",5.3,3.40,4.2,0.26,{fontSize:12,bold:true,color:C.amber});
  s.addText([
    {text:"Time zone overlap: India IST works perfectly for Singapore and Australia",options:{bullet:true,breakLine:true}},
    {text:"Cultural familiarity: large Indian diaspora in APAC tech leadership roles",options:{bullet:true,breakLine:true}},
    {text:"English is primary business language across APAC telcos — no barrier",options:{bullet:true,breakLine:true}},
    {text:"Rates 30-40% above India sub-vendor, 20-30% below Europe — best margin zone",options:{bullet:true,breakLine:true}},
    {text:"Singtel/Telstra BRM migrations = 2-3 year sticky programmes once in",options:{bullet:true,breakLine:false}},
  ],{x:5.3,y:3.74,w:4.22,h:1.50,fontSize:9.5,color:"C8D8EE",fontFace:"Calibri",paraSpaceAfter:4,valign:"top"});
})();

// ══════════════════════════════════════════════
// SLIDE 13 — EUROPE & AMERICAS GTM
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Europe & Americas GTM — Wave 3 (Month 10–18): BT, Vodafone, HSBC");
  sectionTag(s,"EU + AMERICAS",0.38,0.78,C.green);
  card(s,0.3,0.88,4.6,4.72,C.white);
  txt(s,"Europe — Key Accounts & Entry",0.5,0.98,4.2,0.26,{fontSize:12,bold:true,color:C.navy});
  var euAcc=[
    {n:"BT Group",s:"BRM · Siebel",note:"BRM for wholesale billing; Siebel contact centre (60K seats). Entry via Capgemini UK or IBM UK sub-vnd. BT dedicated Oracle supplier portal.",r:"$155–190/hr"},
    {n:"Vodafone Group",s:"BRM",note:"Vodafone BRM deployed across 20+ OpCos. Oracle UK Alliance will intro. Vodafone BRM CoE in Pune — target UK/DE OpCo directly from Month 12.",r:"$140–175/hr"},
    {n:"Deutsche Telekom",s:"BRM · OSM",note:"DT 5G OSS transformation live. BRM 12.x upgrade. Capgemini Germany or Oracle Germany Alliance. German data residency — local entity needed (Month 12+).",r:"$165–200/hr"},
    {n:"HSBC",s:"Siebel CRM",note:"One of world's largest Siebel installations — retail + corporate banking. IBM UK or Capgemini Siebel practice sub-vnd. High compliance overhead but extremely sticky.",r:"$165–205/hr"},
    {n:"Orange Group",s:"BRM · OSM",note:"BRM fixed and mobile. OSM 5G transformation. Oracle France Alliance active. Capgemini FR has Orange account — approach Capgemini first for sub-vnd entry.",r:"$150–185/hr"},
  ];
  euAcc.forEach((a,i)=>{
    var y=1.32+i*0.84;
    s.addShape(pres.shapes.RECTANGLE,{x:0.38,y,w:4.42,h:0.76,fill:{color:i%2===0?C.lightBg:C.white},line:{color:"E0EAF4",width:0.5}});
    txt(s,a.n,0.48,y+0.04,1.52,0.24,{fontSize:10.5,bold:true,color:C.navy});
    txt(s,a.s,2.04,y+0.04,1.0,0.22,{fontSize:9,bold:true,color:C.red,align:"center"});
    txt(s,a.r,3.12,y+0.04,1.58,0.22,{fontSize:9.5,bold:true,color:C.green,align:"right"});
    txt(s,a.note,0.48,y+0.32,4.22,0.40,{fontSize:8.5,color:C.mid,wrap:true});
  });
  card(s,5.1,0.88,4.6,2.34,C.white);
  txt(s,"Americas — Key Accounts",5.3,0.98,4.2,0.26,{fontSize:12,bold:true,color:C.navy});
  var amAcc=[{n:"AT&T",s:"BRM · Siebel",note:"AT&T BRM for enterprise billing; Siebel for B2B. IBM and Accenture are primes.",r:"$185–225/hr"},{n:"Bell Canada",s:"BRM · OSM",note:"CGI Canada is prime — approach CGI for sub-vnd. Oracle Canada Alliance.",r:"$155–185/hr"},{n:"América Móvil",s:"BRM",note:"18-country BRM multi-instance. Oracle LATAM + IBM LATAM sub-vnd.",r:"$110–135/hr"}];
  amAcc.forEach((a,i)=>{
    var y=1.32+i*0.62;
    s.addShape(pres.shapes.RECTANGLE,{x:5.18,y,w:4.42,h:0.56,fill:{color:i%2===0?C.lightBg:C.white},line:{color:"E0EAF4",width:0.5}});
    txt(s,a.n,5.28,y+0.04,1.42,0.22,{fontSize:10.5,bold:true,color:C.navy});
    txt(s,a.s,6.74,y+0.04,0.98,0.22,{fontSize:9,bold:true,color:C.red,align:"center"});
    txt(s,a.r,7.76,y+0.04,1.74,0.22,{fontSize:9,bold:true,color:C.green,align:"right"});
    txt(s,a.note,5.28,y+0.30,4.22,0.22,{fontSize:8.5,color:C.mid,wrap:true});
  });
  card(s,5.1,3.28,4.6,2.32,C.navy);
  txt(s,"Europe / Americas Entry Tactics",5.3,3.38,4.2,0.26,{fontSize:12,bold:true,color:C.amber});
  s.addText([
    {text:"Month 10: UK entity registration (Companies House) for BT/HSBC contracts",options:{bullet:true,breakLine:true}},
    {text:"Month 10: Oracle OpenWorld Europe London — 10+ pre-scheduled meetings",options:{bullet:true,breakLine:true}},
    {text:"Month 11: Capgemini UK/FR sub-vendor registration for BT and Orange",options:{bullet:true,breakLine:true}},
    {text:"Month 12: IBM UK Oracle practice intro via Oracle Alliance London",options:{bullet:true,breakLine:true}},
    {text:"Month 13: First direct RFP response via OPN deal registration EU",options:{bullet:true,breakLine:true}},
    {text:"Americas: CGI Canada is fastest entry — smaller, quicker MSA than US primes",options:{bullet:true,breakLine:false}},
  ],{x:5.3,y:3.72,w:4.22,h:1.80,fontSize:9.5,color:"C8D8EE",fontFace:"Calibri",paraSpaceAfter:4,valign:"top"});
})();

// ══════════════════════════════════════════════
// SLIDE 14 — PHASE 1 FOUNDATION
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Phase 1 — Foundation: Month 0 to 3",C.amber,C.dark);
  sectionTag(s,"PHASE 1",0.38,0.78,C.amber);
  card(s,0.3,1.06,5.8,4.22,C.white);
  txt(s,"Critical First Hires — The Founding Team",0.5,1.16,5.4,0.26,{fontSize:13,bold:true,color:C.navy});
  var hires=[
    {role:"Practice Head / Global Delivery Manager",exp:"15+ yr",ctc:"₹55–75 LPA",why:"Owns client relationships globally + sub-vendor connects; must have contacts at TCS/Wipro + 1 ME/APAC SI"},
    {role:"BRM Architect / Technical Lead",exp:"10+ yr",ctc:"₹38–50 LPA",why:"BRM 12.x, ECE, Pipeline — the revenue engine; global BRM delivery experience preferred"},
    {role:"BRM Senior Developer (×2)",exp:"6–9 yr",ctc:"₹22–32 LPA",why:"Billable Day 1 via India sub-vendor; 2 gives redundancy and faster ramp to ME/APAC"},
    {role:"Siebel Architect / Senior Consultant",exp:"10+ yr",ctc:"₹30–42 LPA",why:"Covers BFSI + global HSBC/SCB demand; support and upgrade deals — long tail"},
    {role:"OSM/UIM/ASAP Lead Consultant",exp:"8+ yr",ctc:"₹34–48 LPA",why:"Rarest global skill — commands $160-200/hr in ME/EU. Non-negotiable hire."},
  ];
  hires.forEach((h,i)=>{
    var y=1.52+i*0.70;
    s.addShape(pres.shapes.RECTANGLE,{x:0.42,y,w:5.56,h:0.62,fill:{color:i%2===0?C.lightBg:C.white},line:{color:"E0E8F0",width:0.5}});
    txt(s,h.role,0.55,y+0.04,2.8,0.28,{fontSize:10,bold:true,color:C.dark});
    txt(s,h.exp,3.40,y+0.04,0.60,0.28,{fontSize:10,color:C.muted,align:"center"});
    txt(s,h.ctc,4.04,y+0.04,1.20,0.28,{fontSize:10,bold:true,color:C.red,align:"center"});
    txt(s,h.why,0.55,y+0.34,5.30,0.22,{fontSize:8.5,color:C.mid,italic:true});
  });
  card(s,6.4,1.06,3.28,4.22,C.navy);
  txt(s,"Month 0–3 Actions",6.6,1.16,2.88,0.26,{fontSize:13,bold:true,color:C.amber});
  var actions=[{w:"Wk 1",t:"Register OPN Silver — free; unlocks global deal registration Day 1"},{w:"Wk 1",t:"Post JDs on LinkedIn Recruiter + Naukri + referral bonus ₹50K"},{w:"Wk 1",t:"Contact Oracle India Alliance Manager via OPN portal"},{w:"Wk 2",t:"Build ICP list: 200 named contacts at global target accounts"},{w:"Wk 2",t:"Cold outreach: Accenture/IBM Oracle CoE leads via LinkedIn InMail"},{w:"Wk 3",t:"First interviews; register on TCS Supplier Portal + Wipro PVMS"},{w:"Wk 3",t:"Build 2-page capability deck (English + Arabic) for global SI submission"},{w:"Wk 4",t:"Make first 2 offers: Practice Head + BRM Architect priority"},{w:"Mo 2",t:"Onboard 4–5 hires; create global rate card (INR + USD)"},{w:"Mo 3",t:"Submit profiles to 3 requirements; sign first sub-vendor MSA"},];
  actions.forEach((a,i)=>{
    var y=1.52+i*0.37;
    s.addShape(pres.shapes.RECTANGLE,{x:6.5,y,w:0.38,h:0.27,fill:{color:C.amber},line:{color:C.amber}});
    txt(s,a.w,6.5,y,0.38,0.27,{fontSize:7.5,bold:true,color:C.dark,align:"center",valign:"middle"});
    txt(s,a.t,6.94,y,2.60,0.27,{fontSize:8.5,color:"C8D8EE",valign:"middle"});
  });
  txt(s,"Est. Phase 1 Investment: ₹60–85 L (salaries + OPN + event travel + tools)",0.3,5.32,5.8,0.22,{fontSize:9.5,bold:true,color:C.mid,italic:true});
})();

// ══════════════════════════════════════════════
// SLIDE 15 — PHASE 2 FIRST REVENUE
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Phase 2 — First Revenue via Sub-vendor Deployment: Month 3–6","1E7A4A");
  sectionTag(s,"PHASE 2",0.38,0.78,C.green);
  card(s,0.3,1.06,9.4,1.28,C.white);
  txt(s,"The Sub-vendor Revenue Machine — India Hub, Global SI Primes, International End Clients",0.5,1.14,9.0,0.26,{fontSize:13,bold:true,color:C.navy});
  var flow=["CS Soft\nHires Resource","CS Soft\nSub-contracts","Prime SI\n(Accenture/TCS/IBM)","SI Deploys At","End Client\n(e&/Telstra/HSBC)"];
  var fc=[C.navy,C.green,C.steel,C.green,"1A5F8A"];
  flow.forEach((f,i)=>{
    var x=0.48+i*1.78;
    s.addShape(pres.shapes.RECTANGLE,{x,y:1.46,w:1.50,h:0.72,fill:{color:fc[i]},line:{color:fc[i]}});
    txt(s,f,x,1.46,1.50,0.72,{fontSize:9,bold:true,color:C.white,align:"center",valign:"middle"});
    if(i<flow.length-1) txt(s,"→",x+1.50,1.68,0.28,0.28,{fontSize:16,bold:true,color:C.muted,align:"center"});
  });
  card(s,0.3,2.56,4.55,2.72,C.white);
  txt(s,"Sub-vendor Margin Model (per resource, USD billing)",0.5,2.66,4.15,0.26,{fontSize:11,bold:true,color:C.navy});
  var lines=[{k:"Bill rate to Prime SI (BRM Sr. Dev)",v:"$65/hr",c:C.dark},{k:"Monthly billing (8hr × 22 days)",v:"$11,440",c:C.dark},{k:"Resource CTC ₹28L → monthly cost",v:"$2,980",c:C.dark},{k:"+ 35% overhead (benefits, infra, ops)",v:"$1,043",c:C.dark},{k:"Total cost per resource / month",v:"$4,023",c:C.dark},{k:"GROSS MARGIN per resource/month",v:"$7,417  (65%)",c:C.green}];
  lines.forEach((l,i)=>{
    var y=3.02+i*0.38;
    var bg2=l.c===C.green?C.greenLt:i%2===0?C.lightBg:C.white;
    s.addShape(pres.shapes.RECTANGLE,{x:0.40,y,w:4.35,h:0.34,fill:{color:bg2},line:{color:"E0EEE8",width:0.5}});
    txt(s,l.k,0.52,y+0.04,2.90,0.26,{fontSize:9.5,bold:l.c===C.green,color:C.dark,valign:"middle"});
    txt(s,l.v,3.48,y+0.04,1.18,0.26,{fontSize:9.5,bold:true,color:l.c,align:"right",valign:"middle"});
  });
  card(s,5.13,2.56,4.55,2.72,C.navy);
  txt(s,"Phase 2 Revenue Targets (USD)",5.33,2.66,4.15,0.26,{fontSize:11,bold:true,color:C.amber});
  var targets=[{mo:"Month 3",head:"2 deployed (India)",rev:"$15–22K/mo"},{mo:"Month 4",head:"4 deployed",rev:"$38–50K/mo"},{mo:"Month 5",head:"5 deployed",rev:"$55–75K/mo"},{mo:"Month 6",head:"6–7 deployed",rev:"$80–110K/mo"}];
  targets.forEach((t,i)=>{
    var y=3.02+i*0.56;
    s.addShape(pres.shapes.RECTANGLE,{x:5.23,y,w:4.35,h:0.48,fill:{color:"223060"},line:{color:"3A5080",width:0.5}});
    txt(s,t.mo,5.35,y+0.06,0.90,0.36,{fontSize:10,bold:true,color:"8AACDA",valign:"middle"});
    txt(s,t.head,6.30,y+0.06,1.50,0.36,{fontSize:10,color:C.white,valign:"middle"});
    txt(s,t.rev,7.86,y+0.06,1.58,0.36,{fontSize:12,bold:true,color:"4ADA8A",align:"right",valign:"middle"});
  });
  txt(s,"Hire 2-3 more in Month 4-5 so Phase 3 ME/APAC push starts immediately",5.23,5.18,4.35,0.22,{fontSize:8.5,color:"7A96BB",italic:true,align:"center"});
})();

// ══════════════════════════════════════════════
// SLIDE 16 — LATERAL HIRE STRATEGY
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Lateral Hire Strategy — Global Talent Pools & How to Attract Them");
  sectionTag(s,"TALENT ACQUISITION",0.38,0.78);
  txt(s,"Primary talent is India-based (cost efficiency). Target India-based professionals with global delivery experience. That combination is CS Soft's pricing power.",0.38,0.88,9.3,0.26,{fontSize:10.5,color:C.mid,italic:true});
  var pools=[
    {org:"TCS Oracle CoE",sub:"Alliance / Telecom CoE",loc:"Siruseri, Pune, Hyderabad, Singapore",how:"Search LinkedIn 'Oracle BRM TCS', 'Siebel TCS'. TCS bonuses mediocre — 15-18% CTC premium converts. Target TCS resources on global accounts (Vodafone Global, Singtel, Airtel)."},
    {org:"Accenture Oracle",sub:"Global CoE (India delivery)",loc:"Bangalore, Hyderabad, Mumbai",how:"Accenture India Oracle CoE delivers globally to e&, BT, Singtel. Resources know global standards. Harder to convert (better comp) but invaluable for ME/APAC lead roles."},
    {org:"Oracle ACS / Consulting",sub:"Oracle Consulting India",loc:"Bengaluru, Hyderabad, Dubai, SGP",how:"Ex-Oracle employees know product roadmap AND client relationships. 'Oracle ACS BRM', 'Oracle Consulting Siebel' on LinkedIn. Highest-value hire — command 20% premium, worth it."},
    {org:"Wipro / Infosys Oracle",sub:"Oracle Communications Practice",loc:"Bangalore, Pune, ME/APAC delivery",how:"'BRM Wipro', 'OSM UIM Infosys' on LinkedIn. Bench consultants especially receptive. Target those with ME/APAC client exposure for CS Soft's global push."},
    {org:"IBM / Capgemini India",sub:"Oracle practices, India delivery",loc:"Bangalore, Pune, Chennai",how:"IBM GBS and Capgemini India Oracle practices deliver to global accounts. Resources with global client exposure at India CTC. Target: 5-8 years in, seeking growth path."},
    {org:"ME / APAC Local Hires",sub:"Local client directors",loc:"Dubai, Abu Dhabi, Singapore",how:"Hire 1 ME + 1 APAC-based senior consultant as CS Soft's local face. They know the market, speak the language. Local presence dramatically improves win rate. Budget $80-100K USD/yr each."},
  ];
  pools.forEach((p,i)=>{
    var col=i%3; var row=Math.floor(i/3);
    var x=0.3+col*3.17; var y=1.22+row*2.06;
    card(s,x,y,3.0,1.94,C.white);
    s.addShape(pres.shapes.RECTANGLE,{x,y,w:3.0,h:0.30,fill:{color:C.navy},line:{color:C.navy}});
    txt(s,p.org,x,y,1.20,0.30,{fontSize:10.5,bold:true,color:C.white,valign:"middle",align:"center"});
    txt(s,p.sub,x+1.24,y,1.74,0.30,{fontSize:8.5,color:"8AACDA",valign:"middle"});
    txt(s,"Locations: "+p.loc,x+0.10,y+0.36,2.80,0.22,{fontSize:8.5,color:C.muted,italic:true});
    txt(s,p.how,x+0.10,y+0.60,2.80,1.28,{fontSize:9,color:C.dark,wrap:true});
  });
  s.addShape(pres.shapes.RECTANGLE,{x:0,y:5.30,w:10,h:0.33,fill:{color:C.navy},line:{color:C.navy}});
  txt(s,"Hire 1 ME-based client director by Month 5 — before GITEX. Local presence closes deals that remote pitches cannot. ROI = first ME logo.",0.38,5.30,9.24,0.33,{fontSize:10,color:C.amber,bold:true,valign:"middle"});
})();

// ══════════════════════════════════════════════
// SLIDE 17 — GLOBAL RATE CARDS
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.white);
  titleBar(s,"Global Talent Profiles, CTC Benchmarks & Bill Rates by Region");
  var hF={fill:{color:C.navy},color:C.white,bold:true,align:"center"};
  var hL={fill:{color:C.navy},color:C.white,bold:true};
  var rows=[
    [{text:"Role",options:hL},{text:"Exp",options:hF},{text:"India CTC",options:hF},{text:"India/Sub-vnd $/hr",options:hF},{text:"ME Direct $/hr",options:hF},{text:"APAC Direct $/hr",options:hF},{text:"EU/US $/hr",options:hF},{text:"Margin",options:hF}],
    [{text:"BRM Architect",options:{bold:true,fill:{color:"FFF0EE"},color:C.dark}},{text:"10–14 yr",options:{align:"center"}},{text:"₹40–52L",options:{bold:true,color:C.red,align:"center"}},{text:"$65–80",options:{bold:true,color:C.green,align:"center"}},{text:"$150–180",options:{bold:true,color:C.amber,align:"center"}},{text:"$120–145",options:{bold:true,color:"2C7BB6",align:"center"}},{text:"$175–220",options:{bold:true,color:C.red,align:"center"}},{text:"44–52%",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"BRM Sr. Developer",options:{color:C.dark}},{text:"6–9 yr",options:{align:"center"}},{text:"₹24–34L",options:{bold:true,color:C.red,align:"center"}},{text:"$48–62",options:{bold:true,color:C.green,align:"center"}},{text:"$110–140",options:{bold:true,color:C.amber,align:"center"}},{text:"$90–115",options:{bold:true,color:"2C7BB6",align:"center"}},{text:"$140–175",options:{bold:true,color:C.red,align:"center"}},{text:"40–48%",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"BRM Developer",options:{color:C.dark}},{text:"3–6 yr",options:{align:"center"}},{text:"₹13–20L",options:{bold:true,color:C.red,align:"center"}},{text:"$30–42",options:{bold:true,color:C.green,align:"center"}},{text:"$75–100",options:{bold:true,color:C.amber,align:"center"}},{text:"$65–85",options:{bold:true,color:"2C7BB6",align:"center"}},{text:"$100–130",options:{bold:true,color:C.red,align:"center"}},{text:"36–44%",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"OSM/UIM Architect",options:{bold:true,fill:{color:"EEF4FF"},color:C.dark}},{text:"8–12 yr",options:{align:"center"}},{text:"₹40–55L",options:{bold:true,color:"2C7BB6",align:"center"}},{text:"$68–85",options:{bold:true,color:C.green,align:"center"}},{text:"$160–200",options:{bold:true,color:C.amber,align:"center"}},{text:"$130–160",options:{bold:true,color:"2C7BB6",align:"center"}},{text:"$200–250",options:{bold:true,color:C.red,align:"center"}},{text:"46–55%",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"ASAP / OSM Senior",options:{color:C.dark}},{text:"5–8 yr",options:{align:"center"}},{text:"₹26–38L",options:{bold:true,color:"2C7BB6",align:"center"}},{text:"$55–70",options:{bold:true,color:C.green,align:"center"}},{text:"$120–155",options:{bold:true,color:C.amber,align:"center"}},{text:"$100–130",options:{bold:true,color:"2C7BB6",align:"center"}},{text:"$155–190",options:{bold:true,color:C.red,align:"center"}},{text:"40–48%",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"Siebel Architect",options:{bold:true,fill:{color:"FFFAEE"},color:C.dark}},{text:"10–15 yr",options:{align:"center"}},{text:"₹34–48L",options:{bold:true,color:C.amber,align:"center"}},{text:"$58–75",options:{bold:true,color:C.green,align:"center"}},{text:"$130–170",options:{bold:true,color:C.amber,align:"center"}},{text:"$100–135",options:{bold:true,color:"2C7BB6",align:"center"}},{text:"$150–200",options:{bold:true,color:C.red,align:"center"}},{text:"42–50%",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"Siebel Sr. Consultant",options:{color:C.dark}},{text:"6–10 yr",options:{align:"center"}},{text:"₹20–28L",options:{bold:true,color:C.amber,align:"center"}},{text:"$42–56",options:{bold:true,color:C.green,align:"center"}},{text:"$100–130",options:{bold:true,color:C.amber,align:"center"}},{text:"$80–105",options:{bold:true,color:"2C7BB6",align:"center"}},{text:"$120–160",options:{bold:true,color:C.red,align:"center"}},{text:"38–46%",options:{bold:true,color:C.green,align:"center"}}],
    [{text:"Practice Head",options:{bold:true,fill:{color:"F0F0F8"},color:C.dark}},{text:"15+ yr",options:{align:"center"}},{text:"₹58–80L",options:{bold:true,color:C.navy,align:"center"}},{text:"Non-billable",options:{color:C.muted,align:"center",italic:true}},{text:"Non-billable",options:{color:C.muted,align:"center",italic:true}},{text:"—",options:{color:C.muted,align:"center"}},{text:"—",options:{color:C.muted,align:"center"}},{text:"Rev Gen",options:{color:C.navy,align:"center",italic:true}}],
  ];
  s.addTable(rows,{x:0.28,y:0.78,w:9.44,h:4.72,colW:[1.62,0.60,0.96,1.26,1.26,1.26,1.20,0.78],border:{pt:0.5,color:"E0E8F0"},fontFace:"Calibri",fontSize:9.5,valign:"middle",rowH:0.44});
  txt(s,"India sub-vendor rates in USD at ₹83/$ blended rate. ME/APAC/EU direct rates are market rates for CS Soft-primed engagements. Margin after India CTC + 35% overhead.",0.28,5.34,9.44,0.22,{fontSize:8,color:C.muted,italic:true});
})();

// ══════════════════════════════════════════════
// SLIDE 18 — PHASE 3 & 4 SCALE
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Phase 3 & 4 — Global Scale to Full Practice (Month 6–24)");
  card(s,0.3,0.82,4.6,4.52,C.white);
  s.addShape(pres.shapes.RECTANGLE,{x:0.3,y:0.82,w:4.6,h:0.36,fill:{color:"2C7BB6"},line:{color:"2C7BB6"}});
  txt(s,"Phase 3 — Global Scale (Month 6–18)",0.3,0.82,4.6,0.36,{fontSize:11.5,bold:true,color:C.white,align:"center",valign:"middle"});
  bullets(s,["Headcount: 18–28 total; add 2 ME/APAC-based client directors (local presence)","Revenue run-rate: $350–700K/month by Month 15","Channel mix: 50% sub-vendor → 50% direct by Month 15; direct accelerating fast","First ME direct logo live (e& or STC) via OPN co-sell or Accenture sub-vnd conversion","First APAC direct logo live (Singtel or Telstra) via Accenture APAC sub-vnd","OPN Gold unlock: deal registration priority + Oracle licence co-sell margin 15-25%","Launch managed services: BRM/Siebel L1/L2/L3 support — recurring revenue stream","Build reusable IP: BRM 12.x migration accelerator toolkit (cuts delivery time 30%)","Dubai + Singapore entities registered; ready for direct ME/APAC contracts"],0.5,1.28,4.22,3.90,10.5);
  card(s,5.1,0.82,4.6,4.52,C.navy);
  s.addShape(pres.shapes.RECTANGLE,{x:5.1,y:0.82,w:4.6,h:0.36,fill:{color:C.red},line:{color:C.red}});
  txt(s,"Phase 4 — Full Global Practice (Month 18–24)",5.1,0.82,4.6,0.36,{fontSize:11.5,bold:true,color:C.white,align:"center",valign:"middle"});
  s.addText([
    {text:"Headcount: 35–50 (28+ billable); mix of India + ME/APAC/EU local hires",options:{bullet:true,breakLine:true}},
    {text:"Revenue run-rate: $1M+/month → $12–18M ARR",options:{bullet:true,breakLine:true}},
    {text:"Channel: 25% sub-vendor, 75% direct — commoditise sub-vnd and move up",options:{bullet:true,breakLine:true}},
    {text:"5+ direct named logos across India, ME, APAC, EU",options:{bullet:true,breakLine:true}},
    {text:"OCI cloud practice: BRM on OCI + Siebel SaaS migration projects",options:{bullet:true,breakLine:true}},
    {text:"RODOD licence resell: 15-25% margin on Oracle licences co-sold",options:{bullet:true,breakLine:true}},
    {text:"Oracle APAC/ME Partner of the Year — nomination target",options:{bullet:true,breakLine:true}},
    {text:"Managed services: 8-12 AMS contracts = 40% of total revenue (high margin)",options:{bullet:true,breakLine:true}},
    {text:"Europe practice live: UK + Germany entities, 2 EU logos, EU delivery capacity",options:{bullet:true,breakLine:false}},
  ],{x:5.3,y:1.28,w:4.22,h:3.90,fontSize:10.5,color:"C8D8EE",fontFace:"Calibri",paraSpaceAfter:5,valign:"top"});
})();

// ══════════════════════════════════════════════
// SLIDE 19 — GLOBAL FINANCIAL PROJECTIONS
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Global Financial Projections — Revenue Ramp (24 Months, USD)");
  var months=["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12","M15","M18","M21","M24"];
  var rev=[0,0,20,50,75,100,140,190,250,320,400,480,620,780,900,1050]; // $K/month
  var heads=[3,5,7,9,11,13,15,17,19,21,24,26,32,38,44,48];
  s.addChart(pres.charts.BAR,[{name:"Monthly Revenue ($K)",labels:months,values:rev}],{
    x:0.3,y:0.82,w:6.1,h:3.42,chartColors:[C.navy],
    chartArea:{fill:{color:C.white}},showLegend:true,legendPos:"b",legendFontSize:10,
    catAxisLabelColor:C.mid,valAxisLabelColor:C.mid,valGridLine:{color:"E0E8F0"},showTitle:false,dataLabelFontSize:7,
  });
  s.addChart(pres.charts.LINE,[{name:"Headcount",labels:months,values:heads}],{
    x:6.5,y:0.82,w:3.18,h:3.42,chartColors:[C.red],
    chartArea:{fill:{color:C.white}},lineSize:3,lineSmooth:true,
    showLegend:true,legendPos:"b",legendFontSize:10,
    catAxisLabelColor:C.mid,valAxisLabelColor:C.mid,valGridLine:{color:"E0E8F0"},showTitle:false,
  });
  var hF2={fill:{color:C.navy},color:C.white,bold:true,align:"center"};
  var hL2={fill:{color:C.navy},color:C.white,bold:true};
  s.addTable([
    [{text:"Metric",options:hL2},{text:"End Year 1",options:hF2},{text:"End Year 2",options:hF2}],
    ["Billable Headcount",{text:"18–22",options:{bold:true,color:C.navy,align:"center"}},{text:"32–44",options:{bold:true,color:C.navy,align:"center"}}],
    ["Monthly Revenue Run-rate",{text:"$480–600K",options:{bold:true,color:C.red,align:"center"}},{text:"$1.0–1.3M",options:{bold:true,color:C.red,align:"center"}}],
    ["Annual Revenue",{text:"$3–4.5M",options:{bold:true,color:C.dark,align:"center"}},{text:"$10–15M",options:{bold:true,color:C.dark,align:"center"}}],
    ["Gross Margin",{text:"40–46%",options:{bold:true,color:C.green,align:"center"}},{text:"44–52%",options:{bold:true,color:C.green,align:"center"}}],
    ["Active Geographies",{text:"India + ME",options:{color:C.mid,align:"center"}},{text:"India/ME/APAC/EU",options:{color:C.mid,align:"center"}}],
    ["Direct Logos",{text:"1–2",options:{bold:true,color:C.navy,align:"center"}},{text:"5–8",options:{bold:true,color:C.navy,align:"center"}}],
  ],{x:0.3,y:4.30,w:9.4,h:1.30,colW:[3.4,3.0,3.0],border:{pt:0.5,color:"D8E4F0"},fontFace:"Calibri",fontSize:10.5,valign:"middle",rowH:0.16});
})();

// ══════════════════════════════════════════════
// SLIDE 20 — OPN GLOBAL PARTNERSHIP
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.lightBg);
  titleBar(s,"Oracle Partner Network (OPN) — Global Partnership Ladder & Benefits");
  var tiers=[
    {name:"OPN Silver",cost:"FREE",timeline:"Day 1",
     benefits:"Oracle logo usage · Partner portal access · Global deal registration · Oracle University discounts · Co-marketing templates · Access to OPN Competency Centre"},
    {name:"OPN Gold",cost:"~$3K/yr",timeline:"Month 6–9",
     benefits:"Deal registration priority (5-10% price advantage) · Co-sell with Oracle sales globally · Oracle licence resell at partner pricing · RODOD delivery engagements · Joint GTM planning"},
    {name:"OPN Platinum",cost:"By invite",timeline:"Year 2+",
     benefits:"Named Oracle Alliance Manager · Joint press releases · Oracle-sourced global leads · Conference speaking slots (CloudWorld, OCP Summit) · Partner of the Year eligibility"},
  ];
  var tColors=[C.green,"2C7BB6",C.red];
  tiers.forEach((t,i)=>{
    var x=0.3+i*3.17;
    card(s,x,0.88,3.0,4.12,C.white);
    s.addShape(pres.shapes.RECTANGLE,{x,y:0.88,w:3.0,h:0.40,fill:{color:tColors[i]},line:{color:tColors[i]}});
    txt(s,t.name,x,0.88,3.0,0.40,{fontSize:13,bold:true,color:C.white,align:"center",valign:"middle"});
    txt(s,"Cost",x+0.15,1.36,1.0,0.22,{fontSize:9,color:C.muted});
    txt(s,t.cost,x+0.15,1.58,1.6,0.38,{fontSize:22,bold:true,color:tColors[i]});
    txt(s,"When",x+0.15,2.02,1.0,0.22,{fontSize:9,color:C.muted});
    txt(s,t.timeline,x+0.15,2.24,2.6,0.28,{fontSize:13,bold:true,color:C.dark});
    s.addShape(pres.shapes.RECTANGLE,{x:x+0.15,y:2.60,w:2.7,h:0.02,fill:{color:"E0E8F0"},line:{color:"E0E8F0"}});
    txt(s,"KEY BENEFITS",x+0.15,2.72,2.7,0.22,{fontSize:8,bold:true,color:C.navy});
    txt(s,t.benefits,x+0.15,2.96,2.7,2.0,{fontSize:10,color:C.dark,wrap:true});
  });
  s.addShape(pres.shapes.RECTANGLE,{x:0,y:5.10,w:10,h:0.53,fill:{color:C.navy},line:{color:C.navy}});
  txt(s,"RODOD Programme: CS Soft's Oracle RODOD status unlocks licence resell alongside consulting — 15-25% margin on Oracle licence sales. Register at partnernetwork.oracle.com Day 1.",0.38,5.10,9.24,0.26,{fontSize:9.5,color:"AABFDD",valign:"middle"});
  txt(s,"Oracle CloudWorld (Las Vegas, Oct) · OCP Summit India · DTW Copenhagen (Jun) · GITEX Dubai (Oct) — attend all four for maximum OPN network leverage.",0.38,5.36,9.24,0.26,{fontSize:9,color:C.amber,valign:"middle",bold:true});
})();

// ══════════════════════════════════════════════
// SLIDE 21 — RISK REGISTER
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.white);
  titleBar(s,"Risk Register & Global Mitigation Plan");
  var hL={fill:{color:C.navy},color:C.white,bold:true};
  var hC={fill:{color:C.navy},color:C.white,bold:true,align:"center"};
  var hi={fill:{color:C.red},color:C.white,bold:true,align:"center"};
  var med={fill:{color:C.amber},color:C.dark,bold:true,align:"center"};
  var lo={fill:{color:C.green},color:C.white,bold:true,align:"center"};
  var rows=[
    [{text:"Risk",options:hL},{text:"Impact",options:hC},{text:"Likelihood",options:hC},{text:"Global Mitigation",options:hL}],
    [{text:"Talent scarcity / counter-offers globally",options:{bold:true}},{text:"HIGH",options:hi},{text:"HIGH",options:hi},
     "Offer 10-15% above market CTC + retention bonus after 12 months. ESOP/profit share roadmap. ME/APAC hires on USD-linked comp — inflation-proof. Start referral pipeline Day 1; ₹50K referral bonus."],
    [{text:"Bench cost during ramp (no billing)",options:{}},{text:"HIGH",options:hi},{text:"MED",options:med},
     "Only hire against confirmed or near-confirmed demand. Use 30-day notice period as deployment buffer. Sub-vendor model means revenue starts Month 3 — limits bench exposure."],
    [{text:"Sub-vendor margin compression by global SIs",options:{}},{text:"MED",options:med},{text:"HIGH",options:hi},
     "Parallel direct client pipeline from Month 4. Negotiate multi-year sub-vendor rates upfront. Diversify: 4+ SIs across India, ME, APAC — no single SI >40% of revenue."],
    [{text:"Geopolitical risk in ME (conflict, policy shifts)",options:{}},{text:"MED",options:med},{text:"LOW",options:lo},
     "Operate via Dubai DIFC entity (politically stable, treaty-protected). Diversify: never >30% of revenue from any single geography. Maintain India revenue base as anchor."],
    [{text:"Key person dependency / attrition",options:{}},{text:"HIGH",options:hi},{text:"MED",options:med},
     "Two people per technology minimum. Cross-train BRM dev on OSM basics. Document all client-specific config. Equity / senior role = retention lever for founding team."],
    [{text:"Oracle product sunset / architecture shift",options:{}},{text:"MED",options:med},{text:"LOW",options:lo},
     "Siebel extended to 2033 — long runway. BRM is mission-critical billing: will not disappear. OCI cloud migration ADDS work. Position cloud migration capability from Month 12 as an upsell."],
    [{text:"Slow sales cycle for direct international logos",options:{}},{text:"MED",options:med},{text:"HIGH",options:hi},
     "Sub-vendor revenue bridges the gap (cash flow positive from Month 3). Set realistic direct-logo timelines (Month 6-9 first close). Local ME/APAC presence shortens cycle by 30-40%."],
  ];
  s.addTable(rows,{x:0.3,y:0.78,w:9.4,h:4.72,colW:[2.48,0.82,0.82,5.28],border:{pt:0.5,color:"E0E8F0"},fontFace:"Calibri",fontSize:10,valign:"middle",rowH:0.52});
})();

// ══════════════════════════════════════════════
// SLIDE 22 — WEEK 1–4 IMMEDIATE ACTIONS
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.navy);
  txt(s,"Week 1–4 Global Execution Plan",0.38,0.10,9.5,0.54,{fontSize:22,bold:true,color:C.white});
  txt(s,"20 irreversible actions across hiring, OPN, SI partnerships and named-account outreach — start all four tracks simultaneously.",0.38,0.60,9.5,0.28,{fontSize:11.5,color:"7A96BB",italic:true});
  var weeks=[
    {wk:"WEEK 1",color:C.red,actions:[
      "Register Oracle OPN Silver at partnernetwork.oracle.com — 30 min, FREE — unlocks global deal registration",
      "Build ICP list: 200 named contacts at 17 Tier-1/2 target accounts (LinkedIn Sales Navigator)",
      "Post 5 JDs on LinkedIn Premium + Naukri: BRM Arch, BRM Dev×2, Siebel Arch, OSM/UIM Lead",
      "Cold outreach: 10 personalised InMails to Accenture/IBM/Capgemini Oracle CoE leads globally",
      "Contact Oracle India Alliance Manager via OPN portal — request intro call",
    ]},
    {wk:"WEEK 2",color:C.amber,actions:[
      "LinkedIn ABM: send 20 personalised InMails to IT Director/VP Tech at ME target accounts (e&, STC, Zain)",
      "Register on TCS Supplier Portal (supplier.tcs.com) + Wipro PVMS — begin vendor onboarding docs",
      "Build 2-page global capability deck (English version) focused on BRM/OSM/Siebel delivery",
      "Research GITEX Dubai Oct — register, book hotel, begin scheduling meetings (6 months out is not too early)",
      "Shortlist first 5-6 candidates per role from Week 1 JD responses; schedule technical screens",
    ]},
    {wk:"WEEK 3",color:"2C9A5A",actions:[
      "Conduct 15-20 first-round interviews; shortlist top 3 per role for final round",
      "Submit initial profiles to any open sub-vendor requirements at TCS/Wipro Oracle CoE",
      "Contact Accenture Dubai / Singapore procurement teams directly via LinkedIn for sub-vnd intake",
      "Begin Oracle OPN Cloud learning paths (free) — BRM Specialist and CX certifications",
      "Negotiate and sign first sub-vendor NDA with one India prime SI",
    ]},
    {wk:"WEEK 4",color:"2C7BB6",actions:[
      "Make first 2 offers: Practice Head + BRM Architect — highest priority, non-negotiable",
      "Close first sub-vendor MSA with India SI prime; register first deal in OPN portal",
      "Arabic capability deck: commission translation (2-page, professional) — ready before GITEX",
      "Submit first BRM/Siebel profiles against open global requirements via sub-vendor",
      "Set up CRM (HubSpot free tier): enter 200 ICP contacts, begin 90-day nurture cadence",
    ]},
  ];
  weeks.forEach((w,i)=>{
    var col=i%2; var row=Math.floor(i/2);
    var x=0.28+col*4.88; var y=1.00+row*2.24;
    var wColor=w.color.indexOf(",")>-1?"2C9A5A":w.color;
    s.addShape(pres.shapes.RECTANGLE,{x,y,w:4.65,h:0.28,fill:{color:wColor},line:{color:wColor}});
    txt(s,w.wk,x,y,4.65,0.28,{fontSize:11,bold:true,color:C.white,align:"center",valign:"middle"});
    w.actions.forEach((a,ai)=>{
      var ay=y+0.32+ai*0.37;
      txt(s,(ai+1)+". "+a,x+0.08,ay,4.50,0.35,{fontSize:8.5,color:"C8D8EE",wrap:true,valign:"top"});
    });
  });
})();

// ══════════════════════════════════════════════
// SLIDE 23 — CLOSE
// ══════════════════════════════════════════════
(function(){
  var s = pres.addSlide(); bg(s, C.navy);
  s.addShape(pres.shapes.RECTANGLE,{x:0,y:0,w:0.18,h:5.625,fill:{color:C.red},line:{color:C.red}});
  txt(s,"The Window Is Global.",0.42,0.60,9.2,0.90,{fontSize:56,bold:true,color:C.white});
  txt(s,"BRM 12.x migrations are live at STC, Telstra, Airtel and Singtel. 5G is forcing OSS transformation across 80 countries.\nSiebel talent is retiring. Oracle's Alliance team needs CS Soft — they have deals but not enough boutique delivery capacity.", 0.42,1.62,9,0.65,{fontSize:13,color:"8AACDA",italic:true});
  var boxes=[
    {num:"01",title:"India First",body:"Sub-vendor revenue by Month 3 via TCS/Wipro/Infosys. India is the cash engine that funds the global expansion."},
    {num:"02",title:"Middle East Second",body:"GITEX in Month 4. OPN co-sell. e& or STC as first global logo by Month 7. Highest rates in the world — non-negotiable."},
    {num:"03",title:"APAC Third",body:"Accenture SG sub-vnd → Singtel or Telstra direct by Month 10. India time zone + diaspora = unfair advantage."},
  ];
  boxes.forEach((b,i)=>{
    var x=0.42+i*3.08;
    s.addShape(pres.shapes.RECTANGLE,{x,y:2.52,w:2.88,h:2.42,fill:{color:"1E3060"},line:{color:C.red,width:1.5}});
    txt(s,b.num,x+0.10,2.62,0.65,0.55,{fontSize:32,bold:true,color:C.red});
    txt(s,b.title,x+0.10,3.20,2.65,0.36,{fontSize:18,bold:true,color:C.white});
    txt(s,b.body, x+0.10,3.60,2.65,1.24,{fontSize:10,color:"8AACDA",wrap:true});
  });
  txt(s,"CS Soft Solutions  ·  Global Oracle Practice Launch  ·  Confidential  ·  June 2026",0.42,5.28,9,0.25,{fontSize:9,color:"4A6280",italic:true});
})();

// ── WRITE FILE ────────────────────────────────
pres.writeFile({ fileName: "CS_Soft_Global_Oracle_Practice_Plan.pptx" })
  .then(function(){ console.log("✅  Saved: CS_Soft_Global_Oracle_Practice_Plan.pptx  (23 slides)"); })
  .catch(function(err){ console.error("❌  Error:", err); process.exit(1); });
