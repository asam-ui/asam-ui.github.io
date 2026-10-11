"""只校验和提取已接受的 website 制品，不构建、不安装依赖。"""
import hashlib, json, pathlib, tarfile, sys
ARCHIVE_HASH = '845d2d40f64a81c869fe4e18d2cec83cb144ee105abad173bdc8aac37c396b93'
CONTENT_HASH = 'cdf96db3341767e55dc1e82dcfcfe0c01538c6311cccf9fb8a36f26fdd2fac51'
archive, destination = map(pathlib.Path, sys.argv[1:])
assert hashlib.sha256(archive.read_bytes()).hexdigest() == ARCHIVE_HASH, '制品哈希不符'
assert not destination.exists(), '目标必须不存在'
with tarfile.open(archive, 'r:gz') as tar:
    entries = tar.getmembers()
    total = 0
    names = set()
    for entry in entries:
        path = pathlib.PurePosixPath(entry.name)
        assert not path.is_absolute() and '..' not in path.parts and '\\' not in entry.name and ':' not in entry.name, '非法路径'
        assert entry.isdir() or entry.isfile(), '禁止链接或特殊文件'
        assert entry.size <= 100 * 1024 * 1024
        total += entry.size
        assert total <= 1024 * 1024 * 1024
        if entry.isfile():
            assert path.as_posix().lower() not in names
            names.add(path.as_posix().lower())
    destination.mkdir(parents=True)
    for entry in entries:
        path = destination / pathlib.PurePosixPath(entry.name)
        if entry.isdir():
            path.mkdir(parents=True, exist_ok=True)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            with tar.extractfile(entry) as source, path.open('xb') as target:
                target.write(source.read())
files = []
for path in sorted(destination.rglob('*')):
    if path.is_file():
        data = path.read_bytes()
        files.append({'path':path.relative_to(destination).as_posix(),'size':len(data),'sha256':hashlib.sha256(data).hexdigest()})
files.sort(key=lambda f: f['path'])
assert hashlib.sha256(json.dumps(files,ensure_ascii=False,separators=(',',':')).encode()).hexdigest() == CONTENT_HASH, '网站闭包哈希不符'
assert (destination / 'index.html').is_file()
assert (destination / '404.html').is_file()
print(json.dumps({'archiveHash':ARCHIVE_HASH,'contentHash':CONTENT_HASH,'filesObserved':len(files)}))
