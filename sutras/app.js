(function(){
'use strict';
const books=window.YANGONG_SUTRAS.books,by=Object.fromEntries(books.map(b=>[b.id,b])),KEY='yangpu_sutra_reader_v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state;try{state=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{state={}}
if(typeof state!=='object'||Array.isArray(state))state={};
state.positions=state.positions&&typeof state.positions==='object'?state.positions:{};
let current=null,timer,restoring=false,navVersion=0;
function afterLayout(fn){requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(fn)))}
function position(fn){const token=++navVersion;restoring=true;afterLayout(()=>{if(token!==navVersion||!document.getElementById('psutra').classList.contains('active'))return;fn();restoring=false})}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}}
function remember(){if(current&&document.getElementById('psutra').classList.contains('active')&&!restoring){state.positions[current]=Math.max(0,window.scrollY||0);save()}}
function readingBlocks(book){
 const blocks=book.blocks.map(b=>({...b}));
 if(blocks.length>1&&blocks[0].kind==='prose'&&blocks[0].text.length<12&&blocks[1].kind==='prose'){blocks[1].text=blocks[0].text+blocks[1].text;blocks.shift()}
 return blocks;
}
function renderCards(){document.getElementById('sutra-list').innerHTML=books.map(b=>`<button type="button" class="bk sutra-book" data-open-sutra="${esc(b.id)}"><span class="bk-info"><span class="bk-name">${esc(b.short)}</span><span class="bk-meta">${esc(b.subtitle)}</span></span><span class="sutra-read-label">读诵</span></button>`).join('')}
// Repetition is a reading aid only: match the stored characters without changing them.
function repeatPatterns(book){
 const lines=book.sections.flatMap(s=>s.lines.map(l=>l.text)),whole=new Map(),counts=new Map();
 lines.forEach(t=>{whole.set(t,(whole.get(t)||0)+1);const chars=Array.from(t);for(let size=4;size<=12;size++)for(let i=0;i+size<=chars.length;i++){const key=chars.slice(i,i+size).join('');counts.set(key,(counts.get(key)||0)+1)}});
 const candidates=[...counts].filter(([,n])=>n>=3).map(([text,n])=>({text,n,length:Array.from(text).length}));
 const maximal=candidates.filter(x=>!candidates.some(y=>y.length>x.length&&y.n===x.n&&y.text.includes(x.text))).map(x=>x.text);
 whole.forEach((n,t)=>{if(n>=2)maximal.push(t)});
 return [...new Set(maximal)].sort((a,b)=>Array.from(b).length-Array.from(a).length);
}
const REPEATS=Object.fromEntries(books.filter(b=>b.sections).map(b=>[b.id,repeatPatterns(b)]));
function repeatedChars(text){
 const chars=Array.from(text),mask=chars.map(()=>false);
 REPEATS[current].forEach(term=>{const part=Array.from(term);for(let i=0;i+part.length<=chars.length;i++)if(part.every((c,k)=>c===chars[i+k]))for(let k=0;k<part.length;k++)mask[i+k]=true});
 // Adjacent repetitions such as 陀啰陀啰 are useful even within a single sentence.
 for(let size=2;size<=6;size++)for(let i=0;i+size*2<=chars.length;i++)if(chars.slice(i,i+size).every((c,k)=>c===chars[i+size+k]))for(let k=0;k<size*2;k++)mask[i+k]=true;
 return mask;
}
function rubyLine(line){const mask=repeatedChars(line.text);return `<p class="sutra-mantra-line${line.n%8===1?' sutra-breath':''}" id="sutra-line-${line.n}"><span class="sutra-line-no" aria-label="第${line.n}句">${line.n}</span><span class="sutra-ruby-text">${Array.from(line.text).map((c,i)=>`<ruby${mask[i]?' class="sutra-repeat"':''}>${esc(c)}<rp>（</rp><rt>${esc(line.pinyin[i])}</rt><rp>）</rp></ruby>`).join('')}</span></p>`}
function source(b){return `<details class="sutra-source"><summary>经文来源与版本</summary><p>${esc(b.source.note)}</p><a href="${esc(b.source.url)}" target="_blank" rel="noopener noreferrer">${esc(b.source.title)}</a></details>`}
function open(id){const b=by[id];if(!b)return;remember();current=id;state.last=id;save();const el=document.getElementById('sutra-reader');
 const isMantra=!!b.sections;
 const controls=`<div class="sutra-controls"><label>篇目<select id="sutra-book-select" aria-label="选择经文">${books.map(x=>`<option value="${x.id}" ${id===x.id?'selected':''}>${esc(x.short)}</option>`).join('')}</select></label>${isMantra?`${b.sections.length>1?`<label>分会<select id="sutra-section-select" aria-label="跳转楞严咒分会">${b.sections.map((s,i)=>`<option value="${i}">${esc(s.title)} · ${s.lines.length}句</option>`).join('')}</select></label>`:''}<button type="button" class="sutra-small-btn" id="sutra-repeat" aria-pressed="${!state.hideRepeats}">${state.hideRepeats?'开启':'关闭'}重复标红</button><button type="button" class="sutra-small-btn" id="sutra-pinyin" aria-pressed="${!state.hidePinyin}">${state.hidePinyin?'显示':'隐藏'}注音</button>`:''}<button type="button" class="sutra-small-btn" id="sutra-start">从头读</button></div>`;
 const text=isMantra?b.sections.map((s,i)=>`<section id="sutra-section-${i}" class="sutra-mantra-section"><h2>${esc(s.title)}<small>第${s.lines[0].n}—${s.lines[s.lines.length-1].n}句</small></h2>${s.lines.map(rubyLine).join('')}</section>`).join(''):readingBlocks(b).map((block,i)=>block.kind==='verse'?`<div class="sutra-verse" id="sutra-block-${i}">${block.lines.map(l=>`<span>${esc(l)}</span>`).join('')}</div>`:`<p class="sutra-paragraph" id="sutra-block-${i}">${esc(block.text)}</p>`).join('');
 el.innerHTML=`<header class="sutra-heading"><p class="sutra-kicker">${esc(b.subtitle)}</p><h1>${esc(b.title)}</h1><p>${isMantra?(b.sections.length>1?'五会全文':'全文')+' · '+b.sections.reduce((n,s)=>n+s.lines.length,0)+'句 · 红字标示重复词句':b.excerpt?'卷六节选 · 偈颂逐行读诵':'原经文 · 自然段阅读，偈颂另起行'}</p></header>${controls}${source(b)}<article class="sutra-text ${isMantra?'sutra-mantra':''} ${isMantra&&state.hidePinyin?'hide-pinyin':''} ${isMantra&&state.hideRepeats?'hide-repeats':''}" lang="zh-Hans">${text}</article><footer class="sutra-footer"><span>${b.excerpt?'节选终':'全文终'}</span><button type="button" class="sutra-small-btn" id="sutra-top">回到篇首</button><button type="button" class="sutra-small-btn" onclick="closeSutra()">返回首页</button></footer>`;
 document.getElementById('sutra-book-select').onchange=e=>open(e.target.value);
 const goTop=()=>{position(()=>window.scrollTo(0,0));state.positions[id]=0;save();const sel=document.getElementById('sutra-section-select');if(sel)sel.value='0'};document.getElementById('sutra-start').onclick=goTop;document.getElementById('sutra-top').onclick=goTop;
 if(isMantra){document.getElementById('sutra-repeat').onclick=e=>{state.hideRepeats=!state.hideRepeats;save();el.querySelector('.sutra-text').classList.toggle('hide-repeats',state.hideRepeats);e.target.textContent=(state.hideRepeats?'开启':'关闭')+'重复标红';e.target.setAttribute('aria-pressed',String(!state.hideRepeats))};const sectionSelect=document.getElementById('sutra-section-select');if(sectionSelect)sectionSelect.onchange=e=>{const target=e.target.value;position(()=>document.getElementById('sutra-section-'+target).scrollIntoView({block:'start'}))};document.getElementById('sutra-pinyin').onclick=e=>{state.hidePinyin=!state.hidePinyin;save();el.querySelector('.sutra-text').classList.toggle('hide-pinyin',state.hidePinyin);e.target.textContent=(state.hidePinyin?'显示':'隐藏')+'注音';e.target.setAttribute('aria-pressed',String(!state.hidePinyin))}}
 show('psutra');const y=Number(state.positions[id])||0;position(()=>window.scrollTo(0,y));
}
window.openSutra=open;window.closeSutra=()=>{remember();navVersion++;restoring=false;goHome()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-open-sutra]');if(b)open(b.dataset.openSutra)});
window.addEventListener('scroll',()=>{clearTimeout(timer);timer=setTimeout(remember,180)},{passive:true});window.addEventListener('pagehide',remember);
renderCards();
// Optional direct links also work when opened from a bookmark.
const id=decodeURIComponent(location.hash.replace(/^#sutra\//,''));if(by[id])open(id);
})();
