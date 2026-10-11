#!/usr/bin/env bash
set -euo pipefail
src="/mnt/c/laragon/www/arlinformatica/resources/js"
tmp="$(mktemp -d "${HOME}/arl-io-bench.XXXXXX")"
trap 'rm -rf -- "$tmp"' EXIT
cp -a "$src" "$tmp/js"
export ARL_BENCH_SRC="$src" ARL_BENCH_LINUX="$tmp/js"
python3 <<'PY'
from pathlib import Path
from time import perf_counter
import os
src=Path(os.environ['ARL_BENCH_SRC'])
files=[n.name for n in src.iterdir() if n.suffix in ('.tsx','.ts')][:80]
for label,path in [('WINDOWS_MNT',Path(os.environ['ARL_BENCH_SRC'])),('LINUX_EXT4',Path(os.environ['ARL_BENCH_LINUX']))]:
    start=perf_counter(); bytes_read=0
    for _ in range(12):
        for name in files:
            bytes_read+=len((path/name).read_bytes())
    print(f'{label} files={len(files)} ms={(perf_counter()-start)*1000:.1f} bytes={bytes_read}')
PY
