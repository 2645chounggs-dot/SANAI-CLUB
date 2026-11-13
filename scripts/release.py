"""Generate signed release metadata. Signing secrets are supplied by CI, never committed."""
import argparse, hashlib, json, os, pathlib, subprocess, tempfile
p=argparse.ArgumentParser();p.add_argument('kind',choices=['apk','ota']);p.add_argument('payload',type=pathlib.Path);p.add_argument('out',type=pathlib.Path);p.add_argument('--version',type=int,required=True);p.add_argument('--name',default='');p.add_argument('--revision',type=int,default=0);p.add_argument('--notes',default='새로운 진화가 준비됐다, BRO.');a=p.parse_args()
assert a.version>0 and (a.kind!='ota' or a.revision>0)
assert a.payload.stat().st_size <= (100*1024*1024 if a.kind=='apk' else 1024*1024)
base='update' if a.kind=='apk' else 'ota'; a.out.mkdir(parents=True,exist_ok=True)
meta={'schema':1,'kind':a.kind,'package':'club.sanai.app','sha256':hashlib.sha256(a.payload.read_bytes()).hexdigest(),'notes':a.notes}
meta.update({'versionCode':a.version,'versionName':a.name} if a.kind=='apk' else {'nativeVersion':a.version,'revision':a.revision})
f=a.out/(base+'.json');f.write_text(json.dumps(meta,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
with tempfile.TemporaryDirectory() as td:
    key=pathlib.Path(td)/'key.pem'
    subprocess.run(['openssl','pkcs12','-in',os.environ['SANAI_KEYSTORE'],'-nocerts','-nodes','-passin','env:SANAI_STORE_PASSWORD','-out',str(key)],check=True,stdout=subprocess.DEVNULL)
    key.chmod(0o600)
    subprocess.run(['openssl','dgst','-sha256','-sign',str(key),'-out',str(a.out/(base+'.sig')),str(f)],check=True)
