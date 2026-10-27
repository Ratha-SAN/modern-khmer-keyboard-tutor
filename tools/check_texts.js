// Run: node tools/check_texts.js  (exit code 1 on any failure)
// QA for docs/texts-km.js: typable on both NiDA maps, well-formed Khmer, sane lengths, unique.
global.window={};const D=require('path').join(__dirname,'..','docs')+'/';
require(D+'nida-layouts.js');require(D+'texts-km.js');
const T=window.TEXTS,U=window.TEXT_UNITS;let fail=0;const bad=(id,m)=>{fail++;console.log('FAIL',id,m)};
const COENG='្',isCons=c=>c>='ក'&&c<='អ',isDep=c=>(c>='ា'&&c<='៑')||c==='៝'||c===COENG;
for(const plat of ['windows','mac']){const set=new Set();for(const c in window.NIDA[plat])window.NIDA[plat][c].forEach(u=>u&&set.add(u));
  const w={};set.forEach(u=>{w[u]=1});
  T.forEach(t=>{const s=t.text.replace(/ /g,'');let i=0;while(i<s.length){let ok=0;for(let n=3;n>0;n--)if(w[s.substr(i,n)]){i+=n;ok=1;break}if(!ok){bad(t.id,plat+' untypable '+JSON.stringify(s[i])+' U+'+s.charCodeAt(i).toString(16));i++}}})}
const ids=new Set(),texts=new Set();
T.forEach(t=>{
  if(ids.has(t.id))bad(t.id,'dup id');ids.add(t.id);if(texts.has(t.text))bad(t.id,'dup text');texts.add(t.text);
  if(!U.find(u=>u.id===t.unit))bad(t.id,'unknown unit');
  if(/​|  |^ | $/.test(t.text))bad(t.id,'zwsp/double space');
  if(!/។$/.test(t.text))bad(t.id,'does not end with ។');
  // natural Khmer spacing: words of a phrase are written together, so chunks are phrases
  const chunks=t.text.split(' '),len=t.text.replace(/ /g,'').length,lo=t.unit===7?550:120,hi=t.unit===7?1100:900;
  if(len<lo||len>hi)bad(t.id,'length '+len+' outside '+lo+'–'+hi);
  if(len/chunks.length<8)bad(t.id,'spaced word by word (avg chunk '+(len/chunks.length).toFixed(1)+')');
  chunks.forEach(c=>{if(c.length>45)bad(t.id,'chunk longer than 45: '+c)});
  chunks.forEach(c=>{if(isDep(c[0]))bad(t.id,'chunk starts with dependent: '+c);
    for(let i=0;i<c.length;i++)if(c[i]===COENG&&!isCons(c[i+1]||''))bad(t.id,'coeng not before consonant in '+c);
    if(/[^ក-៿]/.test(c))bad(t.id,'non-Khmer char in '+c)});
});
const per={};T.forEach(t=>per[t.unit]=(per[t.unit]||0)+1);
const L=t=>t.text.replace(/ /g,'').length;
console.log('passages',T.length,'per unit',JSON.stringify(per),'letters min/max',Math.min(...T.map(L)),Math.max(...T.map(L)),'longest chunk',Math.max(...T.map(t=>Math.max(...t.text.split(' ').map(c=>c.length)))));
console.log(fail?fail+' FAILURES':'0 failures');process.exit(fail?1:0);
