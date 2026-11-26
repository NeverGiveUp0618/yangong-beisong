"""Validate stored original texts and rebuild the browser bundle."""
from pathlib import Path
import json,hashlib,re
ROOT=Path(__file__).resolve().parent;BASE=ROOT/'sutras'
def bodytext(b):
 if b.get('sections'):return ''.join(l['text'] for s in b['sections'] for l in s['lines'])
 return ''.join(x['text'] if x['kind']=='prose' else ''.join(x['lines']) for x in b['blocks'])
def build():
 d=json.loads((BASE/'texts.json').read_text());review=json.loads((BASE/'source-review.json').read_text())
 assert [b['id'] for b in d['books']]==['yaowang','amituo','lengyan']
 for b in d['books']:
  raw=bodytext(b);item=next(x for x in review['books'] if x['id']==b['id'])
  assert hashlib.sha256(raw.encode()).hexdigest()==item['plainSHA256']==b['plainSHA256'],b['id']
  assert b['source']['url'].startswith('https://') and b['characters']==item['characters']
  assert not re.search('TODO|待补|略去|原文略|<script',raw)
 y,a,l=d['books']
 assert bodytext(y).startswith('尔时宿王华菩萨白佛言') and bodytext(y).endswith('利益无量一切众生。」')
 assert bodytext(a).startswith('如是我闻：') and bodytext(a).endswith('欢喜信受，作礼而去。')
 assert len(y['blocks'])==18 and sum(x['kind']=='verse' for x in y['blocks'])==2
 assert len(a['blocks'])==20
 assert len(l['sections'])==5
 assert [(s['lines'][0]['n'],s['lines'][-1]['n']) for s in l['sections']]==[(1,137),(138,178),(179,272),(273,332),(333,427)]
 lines=[line for s in l['sections'] for line in s['lines']]
 assert [line['n'] for line in lines]==list(range(1,428)) and len(bodytext(l))==2620
 for line in lines:
  assert len(line['text'])==len(line['pinyin']) and all(re.fullmatch(r'[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüêńňḿ]+',p) for p in line['pinyin']),line['n']
 (BASE/'data.js').write_text('/* Generated from texts.json by build_sutras.py. */\nwindow.YANGONG_SUTRAS='+json.dumps(d,ensure_ascii=False,separators=(',',':'))+';\n')
 print('通过：两篇经文完整正文/偈颂/首尾及SHA；楞严咒五会427句2620字逐字注音齐全；浏览器数据已重建。')
 return d
if __name__=='__main__':build()
