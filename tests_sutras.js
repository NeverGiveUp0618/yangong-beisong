const fs=require('fs'),assert=require('assert'),cp=require('child_process'),{JSDOM,VirtualConsole}=require('jsdom');
let n=0;const check=(name,fn)=>{fn();n++;console.log('✓ '+name)},sleep=ms=>new Promise(r=>setTimeout(r,ms));
function browser(html,saved={},url='https://nevergiveup0618.github.io/yangong-beisong/'){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html.replace(/<script\b[^>]*src=[^>]*>[\s\S]*?<\/script>/g,''),{url,runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='yes'};for(const[k,v]of Object.entries(saved))w.localStorage.setItem(k,v)}});
 return {dom,w:dom.window,doc:dom.window.document,errors};
}
(async()=>{
 const html=fs.readFileSync('index.html','utf8'),old=browser(cp.execFileSync('git',['show','1d0a99e:index.html'],{encoding:'utf8'}));
 let b=browser(html),{w,doc}=b;
 w.eval(fs.readFileSync('sutras/data.js','utf8'));w.eval(fs.readFileSync('sutras/app.js','utf8'));await sleep(50);
 check('原五本书/口诀/24山助记数据逐项未变',()=>{for(const name of ['RAW','DEFAULT_KJ','DG','DG_CODE','DG_GROUPS'])assert.equal(w.eval('JSON.stringify('+name+')'),old.w.eval('JSON.stringify('+name+')'),name)});old.dom.window.close();
 check('新增经文模块默认折叠，三篇均有阅读入口',()=>{assert(!doc.querySelector('#mod-sutras').classList.contains('open'));assert.equal(doc.querySelectorAll('[data-open-sutra]').length,3)});
 const data=w.YANGONG_SUTRAS;
 for(const id of ['yaowang','amituo']){
  doc.querySelector('[data-open-sutra="'+id+'"]').click();await sleep(30);
  const book=data.books.find(x=>x.id===id),expected=book.blocks.map(x=>x.text||x.lines.join('')).join('');
  check(id+'：全文所有字逐一保留、按句换行且可回首页',()=>{assert(doc.getElementById('psutra').classList.contains('active'));assert.equal(doc.querySelector('.sutra-text').textContent,expected);assert(doc.querySelectorAll('.sutra-sentence').length>20);assert(doc.querySelectorAll('.sutra-verse>span').length===(id==='yaowang'?6:0));assert(doc.querySelector('.sutra-source a').href===book.source.url);assert(doc.querySelector('.sutra-footer').textContent.includes('全文终'))});
  w.closeSutra();await sleep(30);assert(doc.getElementById('ph').classList.contains('active'));
 }
 w.openSutra('lengyan');await sleep(30);
 check('楞严咒五会427句齐全，每句单独一行',()=>{assert.equal(doc.querySelectorAll('.sutra-mantra-section').length,5);assert.equal(doc.querySelectorAll('.sutra-mantra-line').length,427);assert(doc.getElementById('sutra-line-1'));assert(doc.getElementById('sutra-line-427'))});
 check('2620个字与2620个注音一一对应，无自动猜音',()=>{assert.equal(doc.querySelectorAll('.sutra-text ruby').length,2620);for(const s of data.books[2].sections)for(const line of s.lines){const rs=[...doc.querySelectorAll('#sutra-line-'+line.n+' ruby')];assert.equal(rs.map(r=>r.firstChild.textContent).join(''),line.text);assert.deepEqual(rs.map(r=>r.querySelector('rt').textContent),Array.from(line.pinyin))}});
 check('注音可隐藏再显示，文字始终完整',()=>{doc.getElementById('sutra-pinyin').click();assert(doc.querySelector('.sutra-text').classList.contains('hide-pinyin'));assert.equal(doc.getElementById('sutra-pinyin').getAttribute('aria-pressed'),'false');doc.getElementById('sutra-pinyin').click();assert(!doc.querySelector('.sutra-text').classList.contains('hide-pinyin'))});
 const jump=doc.getElementById('sutra-section-select');jump.value='4';jump.dispatchEvent(new w.Event('change'));await sleep(70);
 check('五会跳转到相应标题，篇目切换不混正文',()=>{const sel=doc.getElementById('sutra-section-select');sel.value='4';assert.equal(doc.getElementById('sutra-section-4').dataset.scrolled,'yes');const book=doc.getElementById('sutra-book-select');book.value='amituo';book.dispatchEvent(new w.Event('change'));assert(doc.querySelector('h1').textContent.includes('阿弥陀经'));assert(!doc.querySelector('ruby'))});
 check('纯阅读不修改练习成绩、口诀和自定义数据',()=>{assert.equal(w.localStorage.getItem('yangpu'),null);assert.equal(w.localStorage.getItem('yangpu_kj'),null);assert(JSON.parse(w.localStorage.getItem('yangpu_sutra_reader_v1')).last==='amituo')});
 check('新旧页面运行均无脚本异常',()=>assert.deepEqual(b.errors,[]));
 b.dom.window.close();b=browser(html,{'yangpu':'{"keep":true}','yangpu_kj':'[{"custom":"原样"}]','yangpu_sutra_reader_v1':'{bad'},'https://nevergiveup0618.github.io/yangong-beisong/#sutra/lengyan');w=b.w;doc=b.doc;w.eval(fs.readFileSync('sutras/data.js','utf8'));w.eval(fs.readFileSync('sutras/app.js','utf8'));await sleep(30);
 check('直链可打开注音全文，损坏阅读位置不影响旧个人数据',()=>{assert.equal(doc.querySelectorAll('.sutra-mantra-line').length,427);assert.equal(w.localStorage.getItem('yangpu'),'{"keep":true}');assert.equal(w.localStorage.getItem('yangpu_kj'),'[{"custom":"原样"}]')});
 b.dom.window.close();console.log('通过 '+n+' 项经文读诵及旧内容保护检查');
})().catch(e=>{console.error(e);process.exitCode=1});
