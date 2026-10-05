// 罗盘度数助记测试：NODE_PATH=<八字象义/node_modules> node tests_deg.js index.html
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const vc=new VirtualConsole();const errs=[];vc.on('jsdomError',e=>errs.push(e.message));vc.on('error',e=>errs.push(String(e)));
const d=new JSDOM(fs.readFileSync(process.argv[2],'utf8'),{runScripts:'dangerously',url:'http://localhost/',virtualConsole:vc,pretendToBeVisual:true});
const w=d.window,doc=w.document;w.scrollTo=()=>{};
setTimeout(()=>{
let bad=0;const ok=(c,m)=>{console.log(c?'ok':'FAIL',m);if(!c)bad++};
ok(!errs.length,'加载无报错 '+errs.join('|'));
const DG=w.eval('DG'),S=['子','癸','丑','艮','寅','甲','卯','乙','辰','巽','巳','丙','午','丁','未','坤','申','庚','酉','辛','戌','乾','亥','壬'];
ok(DG.length===24&&DG.every((x,i)=>x[0]===S[i]&&x[1]===i*15),'24 山顺序与度数（每山 15°）');
ok(DG.every(x=>w.eval('DG_CODE')[w.eval('dgCode')(x[1])]===x[4]),'每山编码物＝度数后两位的编码');
ok(DG.every(x=>{const n=Math.floor(x[1]/100);return n===0?x[3]==='':x[3].startsWith(String(n))}),'数量＝百位');
w.eval('dgOpen()');ok(doc.getElementById('pdeg').classList.contains('active'),'进入助记页');
const items=doc.querySelectorAll('#dg-list details.dg-item');ok(items.length===24,'24 个折叠条');
ok(![...items].some(x=>x.open),'默认全部收起');
ok(items[16].querySelector('summary').textContent.includes('申')&&items[16].querySelector('summary').textContent.includes('240'),'收起时显示字与度数');
ok(!items[16].querySelector('summary').textContent.includes('司令'),'收起时不露助记');
ok(items[16].querySelector('.dg-body').textContent.includes('猴子')&&items[16].querySelector('.dg-body').textContent.includes('司令'),'展开内容是猴子+2个+司令');
w.eval("dgTab('prac')");let right=0;
for(let k=0;k<12;k++){const q=w.eval('DGP.deck[DGP.i]');const ans=q.mode==='deg2zi'?q.x[0]:q.x[1]+'°';
  const btns=[...doc.querySelectorAll('#dg-prac .dg-opts button')];ok(btns.length===4&&btns.some(b=>b.dataset.v===ans)&&new Set(btns.map(b=>b.dataset.v)).size===4,'第'+(k+1)+'题 4 个不重复选项含正解');
  const pick=k%3===0?btns.find(b=>b.dataset.v!==ans):btns.find(b=>b.dataset.v===ans);if(pick.dataset.v===ans)right++;pick.click();
  doc.querySelector('#dg-fb .btn').click();}
ok(doc.getElementById('dg-prac').textContent.includes(right+' / 12'),'结果页判分 '+right+'/12');
const st=JSON.parse(w.localStorage.getItem('yangpu'));ok(st._deg.seen===12&&st._deg.known===right,'按题写进当日统计');
ok(st._history[0].type==='deg','写进历史（热力图）');
w.eval('goHome()');ok(doc.getElementById('h-total').textContent==='12'&&doc.getElementById('h-streak').textContent==='1','首页今日已背/连续天数计入');
process.exit(bad?1:0)},500);
