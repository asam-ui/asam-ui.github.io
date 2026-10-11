"""只追加交付元数据；接受网站内的全部原文件、workspace文档版本保持不变。"""
import hashlib, json, pathlib, sys
root = pathlib.Path(sys.argv[1])
SOURCE = 'abb44e4d0431ffaad22c5c09aa3a761c13c406e1'
ORIGINAL = 'cdf96db3341767e55dc1e82dcfcfe0c01538c6311cccf9fb8a36f26fdd2fac51'
def inventory():
    result = []
    for path in sorted(root.rglob('*')):
        if path.is_file():
            data = path.read_bytes()
            result.append({'path':path.relative_to(root).as_posix(),'size':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    return sorted(result,key=lambda x:x['path'])
def fingerprint(files):
    return hashlib.sha256(json.dumps(files,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
before = inventory()
assert fingerprint(before) == ORIGINAL
content = json.loads((root/'content-manifest.json').read_text(encoding='utf-8'))
assert content['sourceSha'] == SOURCE and content['docsVersion'] == 'workspace'
assert content['base'] == '/' and content['websiteUrl'] == 'https://asam-ui.github.io/'
assert not (root/'.nojekyll').exists() and not (root/'artifact-manifest.json').exists()
(root/'.nojekyll').write_bytes(b'')
files = inventory()
metadata = {'schemaVersion':1,'sourceSha':SOURCE,'docsVersion':'workspace','sourceWebsiteFingerprint':ORIGINAL,'provenance':{'projectId':32,'pipelineId':389,'jobId':646,'ref':'main','sha':SOURCE},'adaptation':'Only .nojekyll and this delivery metadata appended; accepted website bytes unchanged','files':[{'path':f['path'],'bytes':f['size'],'sha256':f['sha256']} for f in files]}
(root/'artifact-manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
after = inventory()
assert all(f in after for f in before)
print(json.dumps({'sourceWebsiteFingerprint':ORIGINAL,'deploymentFingerprint':fingerprint(after),'originalFilesObserved':len(before),'added':['.nojekyll','artifact-manifest.json'],'rebuild':False,'docsVersion':'workspace'}))
