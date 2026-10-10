from pathlib import Path
from html.parser import HTMLParser
import json

root=Path(__file__).resolve().parents[2]
class Audit(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[]; self.assets=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        for k in ['src','href']:
            if a.get(k,'').startswith(('assets/','js/')):self.assets.append(a[k])
a=Audit();a.feed((root/'index.html').read_text(encoding='utf-8'))
assert len(a.ids)==len(set(a.ids)), 'Duplicate DOM IDs'
assert all((root/p).is_file() for p in a.assets), 'Missing asset'
assert (root/'LICENSE').is_file()
result={'unique_dom_ids':len(a.ids),'local_assets':a.assets,'license_retained':True}
print(json.dumps(result,ensure_ascii=False,indent=2))
