"""Targeted rewrite contract and browser comparison/edit regression."""
from pathlib import Path
import json
import sys
import threading
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, HTTPServer
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
from playwright.sync_api import sync_playwright

def block(number,action='walks'):
    return f'=== Segment {number} ===\nintegrated_multimodal_description:\n[Shot 1] Live-action, a woman {action}.\n\noverall_soundscape:\nFootsteps.\n\nnon_diegetic_music:\nN/A'
original=block(1)+'\n\n'+block(2)+'\n\n'+block(3)+'\n'
data={'mode':'T2VA','model':'test','segmentCount':3,'segmentSeconds':5,'currentOutput':original,'targetSegment':2,'editInstruction':'Only change camera motion','idea':'test','scriptOutput':'','aspectRatio':'16:9','width':1024,'height':576}
selected,prompt,number=server.prepare_segment_rewrite(data)
assert number==2 and selected['segmentCount']==1 and 'READ-ONLY FULL PROMPT CONTEXT' in prompt
assert 'Return ONLY === Segment 2 ===' in prompt
fixed,warnings=server.finish_segment_rewrite(block(2,'walks as the camera pans'),selected,2,original)
assert 'Segment 2' in fixed
for bad in [block(1),block(2)+'\n'+block(3),'=== Segment 2 ===\nintegrated_multimodal_description: [Shot 1] Test']:
    try:server.finish_segment_rewrite(bad,selected,2,original)
    except ValueError:pass
    else:raise AssertionError('Unsafe revision accepted')
dialogue=block(2,'says <d>[English] Original!</d>')
try:server.finish_segment_rewrite(block(2,'says <d>[English] Changed!</d>'),selected,2,dialogue)
except ValueError:pass
else:raise AssertionError('Changed original dialogue accepted')

url=sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8765'
backend_calls=[]
class MockBackend(BaseHTTPRequestHandler):
    def do_POST(self):
        backend_calls.append(json.loads(self.rfile.read(int(self.headers['Content-Length']))))
        content=block(2,'walks as the camera pans')
        body=json.dumps({'choices':[{'message':{'content':content}}]}).encode()
        self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(body)
    def log_message(self,*args):pass
fake=HTTPServer(('127.0.0.1',0),MockBackend)
threading.Thread(target=fake.serve_forever,daemon=True).start()
try:
    request={**data,'backend':'openai','baseUrl':f'http://127.0.0.1:{fake.server_port}','images':[]}
    req=urllib.request.Request(url+'/api/rewrite-segment',data=json.dumps(request).encode(),headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=15) as response:reply=json.load(response)
    assert reply['targetSegment']==2 and 'camera pans' in reply['output']
    assert backend_calls and 'Return ONLY === Segment 2 ===' in str(backend_calls[0])
finally:
    fake.shutdown();fake.server_close()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':1366,'height':768})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url,wait_until='networkidle')
    page.evaluate("setWorkflow('script');document.querySelector('#scriptResult').value='same\\nold action\\nremove me';reviewedScriptSource=document.querySelector('#scriptResult').value;renderStoryReview({review:'QA',revisedScript:'same\\nnew action\\nadded line',score:80,ruleIssues:[]});")
    page.locator('#compareRevision').click()
    assert page.locator('#revisionCompare').is_visible()
    assert page.locator('#originalDiff .changed').count()>0
    assert page.locator('#revisionDiff .added-text').count()>0
    assert page.locator('#originalDiff').inner_text().startswith('same')
    page.locator('#nextChange').click()
    if len(sys.argv)>2:
        shots=Path(sys.argv[2]);shots.mkdir(parents=True,exist_ok=True);page.locator('#revisionCompare').screenshot(path=str(shots/'revision-compare.png'))
    page.locator('#editRevisionTitle').click()
    page.locator('#diffEditor').fill('same\nnew action\n<script>safe text</script>')
    page.wait_for_timeout(250)
    assert page.locator('#revisionDiff script').count()==0
    assert '<script>safe text</script>' in page.locator('#revisionDiff').inner_text()
    page.locator('#adoptCompared').click()
    assert '<script>safe text</script>' in page.locator('#scriptResult').input_value()
    page.locator('#undoScriptRevision').click()
    assert page.locator('#scriptResult').input_value()=='same\nold action\nremove me'
    page.evaluate("document.querySelector('#scriptResult').value='changed after review'")
    page.locator('#compareRevision').click()
    assert page.locator('#adoptCompared').is_disabled()
    page.locator('#closeCompare').click()
    page.evaluate('text=>{setWorkflow("direct");fullOutput=text;activeSegment=-1;parseSegments();showSegment(1);}',original)
    page.locator('#result').fill(block(2,'runs'))
    page.locator('#saveSegmentEdit').click()
    edited=page.evaluate('fullOutput')
    assert edited==original.replace('Segment 2 ===\nintegrated_multimodal_description:\n[Shot 1] Live-action, a woman walks.','Segment 2 ===\nintegrated_multimodal_description:\n[Shot 1] Live-action, a woman runs.')
    assert page.evaluate('snapshot().output')==edited
    page.evaluate('applySnapshot(snapshot());showSegment(1)')
    page.locator('#undoSegmentEdit').click()
    assert page.evaluate('fullOutput')==original
    captured=[]
    def mock(route):
        captured.append(route.request.post_data_json)
        route.fulfill(status=200,content_type='application/json',body=json.dumps({'output':fixed,'warnings':[]}))
    page.route('**/api/rewrite-segment',mock)
    page.locator('#segmentEditInstruction').fill('Only change camera motion')
    page.locator('#rewriteSegment').click()
    page.wait_for_function("fullOutput.includes('camera pans')")
    assert captured[0]['targetSegment']==2 and captured[0]['currentOutput']==original
    out=page.evaluate('fullOutput')
    assert out[:out.index('=== Segment 2 ===')]==original[:original.index('=== Segment 2 ===')]
    assert out[out.index('=== Segment 3 ==='):]==original[original.index('=== Segment 3 ==='):]
    page.locator('#undoSegmentEdit').click()
    assert page.evaluate('fullOutput')==original
    page.unroute('**/api/rewrite-segment')
    page.route('**/api/rewrite-segment',lambda route:route.fulfill(status=500,content_type='application/json',body='{"error":"QA failure"}'))
    page.locator('#rewriteSegment').click()
    page.wait_for_function("!document.querySelector('#stopSegmentRewrite').offsetParent")
    assert page.evaluate('fullOutput')==original
    page.unroute('**/api/rewrite-segment')
    pending=[]
    page.route('**/api/rewrite-segment',lambda route:pending.append(route))
    page.locator('#rewriteSegment').click()
    page.locator('#stopSegmentRewrite').wait_for(state='visible')
    page.locator('#stopSegmentRewrite').click()
    page.locator('#stopSegmentRewrite').wait_for(state='hidden')
    assert page.evaluate('fullOutput')==original
    for route in pending:
        try:route.abort()
        except Exception:pass
    assert not errors,errors
    browser.close()
print('Comparison highlight and targeted segment editing checks passed')
