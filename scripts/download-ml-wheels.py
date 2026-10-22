"""Resumable parallel HTTPS ranges; verify official PyPI hashes before installation."""
import concurrent.futures
import hashlib
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "research" / ".wheel-cache"
CHUNK = 1024 * 1024


def fetch_chunk(wheel, number):
    parts = ROOT / (wheel["filename"] + ".parts")
    parts.mkdir(exist_ok=True)
    output = parts / f"{number:05}.part"
    start = number * CHUNK
    end = min(wheel["size"] - 1, start + CHUNK - 1)
    length = end - start + 1
    if output.exists() and output.stat().st_size == length:
        return
    for attempt in range(5):
        try:
            request = urllib.request.Request(wheel["url"], headers={"Range": f"bytes={start}-{end}"})
            with urllib.request.urlopen(request, timeout=45) as response:
                expected_range = f"bytes {start}-{end}/{wheel['size']}"
                if response.status != 206 or response.headers.get("Content-Range") != expected_range:
                    raise ValueError("Server did not return the requested byte range")
                data = response.read(length + 1)
                if len(data) != length:
                    raise ValueError("Incomplete byte range")
            output.write_bytes(data)
            return
        except Exception:
            if attempt == 4:
                raise
            time.sleep(1 + attempt)


def main():
    manifest = json.loads((ROOT / "manifest.json").read_text())
    pending = []
    for wheel in manifest:
        target = ROOT / wheel["filename"]
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == wheel["sha256"]:
            continue
        pending.append(wheel)
    tasks = [(w, i) for w in pending for i in range((w["size"] + CHUNK - 1) // CHUNK)]
    print(f"Downloading {len(pending)} wheels in {len(tasks)} chunks", flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        futures = [pool.submit(fetch_chunk, w, i) for w, i in tasks]
        for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
            future.result()
            if i % 10 == 0 or i == len(futures):
                print(f"Chunks verified by length: {i}/{len(futures)}", flush=True)
    for wheel in pending:
        target = ROOT / wheel["filename"]
        parts = ROOT / (wheel["filename"] + ".parts")
        with target.open("wb") as output:
            for i in range((wheel["size"] + CHUNK - 1) // CHUNK):
                output.write((parts / f"{i:05}.part").read_bytes())
        if hashlib.sha256(target.read_bytes()).hexdigest() != wheel["sha256"]:
            raise ValueError(f"SHA-256 mismatch: {wheel['filename']}; do not install")
        print(f"SHA-256 verified: {wheel['filename']}", flush=True)


if __name__ == "__main__":
    main()
