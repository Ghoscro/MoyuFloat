"""Download a pinned public depth model with resume and SHA-256 verification."""
from pathlib import Path
import hashlib
import json
import time
import urllib.request

REVISION = '4472b7362082ad9968fee890ca0f1e5aca36b93d'
URL = f'https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/{REVISION}/onnx/model.onnx'
SIZE = 99060839
SHA256 = 'afb6a5c28f3b6bf1618c6e43f02073ef9dfdc70e937502d51603e57b0a1df10c'

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def main():
    root = Path(__file__).resolve().parent / 'models'
    root.mkdir(exist_ok=True)
    target = root / 'model.onnx'
    partial = root / 'model.part'
    if target.exists() and target.stat().st_size == SIZE and digest(target) == SHA256:
        print('Verified local model already installed.')
        return
    for attempt in range(6):
        offset = partial.stat().st_size if partial.exists() else 0
        if offset == SIZE:
            break
        if offset > SIZE:
            raise RuntimeError('Partial model exceeds expected size. Keep it for inspection.')
        req = urllib.request.Request(URL, headers={'Range': f'bytes={offset}-', 'User-Agent': 'MoyuFloat-Local-Setup/1.0'})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                if offset and response.status != 206:
                    print('Server did not honor resume; restarting download.', flush=True)
                    offset = 0
                if response.status == 206 and not response.headers.get('Content-Range', '').startswith(f'bytes {offset}-'):
                    raise RuntimeError('Unexpected resume range')
                with partial.open('ab' if offset else 'wb') as f:
                    last_print = offset
                    while True:
                        block = response.read(1024 * 1024)
                        if not block:
                            break
                        f.write(block)
                        offset += len(block)
                        if offset > SIZE:
                            raise RuntimeError('Response exceeds expected model size')
                        if offset-last_print > 10*1024*1024:
                            print(f'Downloaded {offset/1048576:.1f} / {SIZE/1048576:.1f} MB', flush=True)
                            last_print = offset
            if partial.stat().st_size == SIZE:
                break
        except Exception as error:
            print(f'Attempt {attempt+1} interrupted: {type(error).__name__}; partial file retained.', flush=True)
        time.sleep(1)
    if not partial.exists() or partial.stat().st_size != SIZE:
        raise RuntimeError('Incomplete download. Run this script again to resume.')
    actual = digest(partial)
    if actual != SHA256:
        raise RuntimeError('Model hash mismatch; partial file preserved, model not installed.')
    partial.replace(target)
    (root/'receipt.json').write_text(json.dumps({'revision':REVISION,'size':SIZE,'sha256':actual,'source':URL},indent=2),encoding='utf-8')
    print('Local model installed and SHA-256 verified.', flush=True)

if __name__ == '__main__':
    main()
