"""Browser integration for template use, Skill transmission and full backup recovery."""
from pathlib import Path
import json
import sys
import tempfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8768'
with sync_playwright() as p, tempfile.TemporaryDirectory() as folder:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={"width":1366,"height":768},accept_downloads=True)
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url,wait_until='networkidle')
    page.locator('#templateBtn').click()
    page.locator('#templateName').fill('QA template')
    page.locator('#templateIdea').fill('QA complete creative brief')
    page.locator('#templateStyle').fill('QA style')
    page.locator('#saveTemplate').click()
    use=page.locator('#templateList .list-row').filter(has_text='QA template').locator('[data-use]')
    use.click()
    assert page.locator('#idea').input_value()=='QA complete creative brief'
    assert not page.locator('#workspaceDrawer').is_visible()
    page.locator('[data-workflow="script"]').click()
    page.locator('#templateBtn').click()
    use.click()
    assert page.locator('#scriptBrief').input_value()=='QA complete creative brief'
    assert page.locator('#scriptWorkflow').is_visible()
    page.locator('#skillBtn').click()
    page.locator('#skillName').fill('QA skill')
    page.locator('#skillDescription').fill('QA creative direction')
    page.locator('#skillInstructions').fill('QA_SKILL_TRANSMISSION: use tactile camera movement.')
    page.locator('#saveSkill').click()
    page.locator('#skillList .list-row').filter(has_text='QA skill').locator('[data-toggle-skill]').click()
    page.locator('#closeDrawer').click()
    payload=page.evaluate('payload()')
    assert any('QA_SKILL_TRANSMISSION' in s['instructions'] for s in payload['selectedSkills'])
    assert 'QA_SKILL_TRANSMISSION' in server.build_script_prompt(payload)
    assert 'QA_SKILL_TRANSMISSION' in server.build_user_prompt(payload)
    page.evaluate("settings.apiKey='SECRET_QA'; saveSettingsLocal(); document.querySelector('#segmentCount').value='3'; document.querySelector('#segmentSeconds').value='10'; total();")
    page.locator('#settingsBtn').click()
    with page.expect_download() as downloaded:
        page.locator('#exportAll').click()
    file=Path(folder)/'backup.json'
    downloaded.value.save_as(file)
    data=json.loads(file.read_text(encoding='utf-8'))
    assert data['format']=='h3-studio-backup'
    assert 'apiKey' not in data['settings']
    assert page.evaluate('H3Backup.makeBackup(true).settings.apiKey')=='SECRET_QA'
    assert any(x['name']=='QA template' for x in data['templates'])
    assert any(x['name']=='QA skill' for x in data['skills'])
    assert data['defaults']['fields']['segmentSeconds']=='10'
    assert data['defaults']['fields']['customScriptLanguage']=='Bahasa Melayu'
    assert data['defaults']['fields']['customPromptLanguage']=='Bahasa Melayu'
    legacy=json.loads(json.dumps(data));legacy['defaults']['fields'].pop('customScriptLanguage');legacy['defaults']['fields'].pop('customPromptLanguage')
    assert page.evaluate('data=>H3Backup.validateBackup(data).format',legacy)=='h3-studio-backup'
    page.evaluate("localStorage.setItem('h3.templates.v2','[]');localStorage.setItem('h3.skills.v1','[]');localStorage.setItem('h3.selectedSkills','[]');")
    page.on('dialog', lambda dialog: dialog.accept())
    page.locator('#importAll').set_input_files(str(file))
    page.wait_for_function("allTemplates().some(x=>x.name==='QA template') && selectedSkills().some(x=>x.name==='QA skill')")
    page.wait_for_load_state('networkidle')
    assert page.locator('#segmentSeconds').input_value()=='10'
    assert page.evaluate('settings.apiKey')=='SECRET_QA'
    # Conflict preserves both versions, repeated import does not multiply copies.
    page.evaluate("const rows=allTemplates();rows.find(x=>x.name==='QA template').idea='LOCAL MODIFIED';saveTemplates(rows);")
    page.evaluate('(data)=>H3Backup.restoreBackup(data)',data)
    page.evaluate('(data)=>H3Backup.restoreBackup(data)',data)
    assert page.evaluate("allTemplates().filter(x=>x.name==='QA template').length")==2
    assert page.evaluate("allTemplates().some(x=>x.idea==='LOCAL MODIFIED')")
    before=page.evaluate("JSON.stringify({...localStorage})")
    invalid={**data,'skills':[{'id':'invalid','name':'invalid'}]}
    assert page.evaluate("data=>{try{H3Backup.restoreBackup(data);return false}catch{return true}}",invalid)
    assert page.evaluate("JSON.stringify({...localStorage})")==before
    assert page.evaluate("data=>{const orig=Storage.prototype.setItem;let failed=false;Storage.prototype.setItem=function(k,v){if(k==='h3.skills.v1'&&!failed){failed=true;throw Error('quota')}return orig.call(this,k,v)};try{H3Backup.restoreBackup(data);return false}catch{return true}finally{Storage.prototype.setItem=orig}}",data)
    # The recovery snapshot itself is retained; all application keys roll back.
    assert page.evaluate("allTemplates().filter(x=>x.name==='QA template').length")==2
    page.evaluate("document.querySelector('#scriptResult').value='OLD APPROVED SCRIPT';document.querySelector('#idea').value='NEW TEMPLATE';")
    assert page.evaluate('payload(true).scriptOutput')==''
    assert page.evaluate('snapshot().config.scriptOutput')=='OLD APPROVED SCRIPT'
    page.evaluate("document.querySelector('#idea').value='Convert: OLD APPROVED SCRIPT';")
    assert page.evaluate('payload(true).scriptOutput')=='OLD APPROVED SCRIPT'
    captured=[]
    def mock_generation(route):
        captured.append(route.request.post_data_json)
        route.fulfill(status=200,content_type='application/x-ndjson',body='{"type":"done","final":"QA final prompt","warnings":[]}\n')
    page.route('**/api/generate-stream',mock_generation)
    page.evaluate("document.querySelector('#idea').value='QA fresh template';setWorkflow('direct');")
    page.locator('#generate').click()
    page.wait_for_function("document.querySelector('#result').value==='QA final prompt'")
    assert captured and captured[0]['scriptOutput']==''
    assert any('QA_SKILL_TRANSMISSION' in skill['instructions'] for skill in captured[0]['selectedSkills'])
    assert not errors,errors
    browser.close()
print('Template, Skill transmission and backup recovery checks passed')
