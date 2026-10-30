#!/usr/bin/env python
"""Rebuild the data, models, and results on Windows, macOS, or Linux (pure Python, no bash needed).

    python run_all.py                    # full run: 1,000 customers, all of 2025 (about 20-40 minutes)
    python run_all.py --customers 200    # smaller, faster test run (numbers will differ)
    python run_all.py --skip-generate    # reuse data/raw if you already generated it
"""
import argparse, shutil, subprocess, sys, urllib.request, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
GEN = ROOT / "data" / "sparkov"
RAW = ROOT / "data" / "raw"
REPO = "https://github.com/namebrandon/Sparkov_Data_Generation"

def run(args, cwd=ROOT):
    print("\n>", " ".join(str(a) for a in args), flush=True)
    subprocess.run([str(a) for a in args], cwd=cwd, check=True)

def get_generator(use_zip):
    if (GEN / "datagen.py").exists(): return
    GEN.parent.mkdir(parents=True, exist_ok=True)
    if not use_zip and shutil.which("git"):
        try: run(["git", "clone", "--depth", "1", REPO + ".git", GEN]); return
        except subprocess.CalledProcessError: print("git clone failed; downloading a zip instead")
    print("Downloading the generator as a zip file...")
    z = GEN.parent / "sparkov.zip"
    urllib.request.urlretrieve(REPO + "/archive/refs/heads/master.zip", z)
    with zipfile.ZipFile(z) as f: f.extractall(GEN.parent)
    z.unlink(); next(GEN.parent.glob("Sparkov_Data_Generation-*")).rename(GEN)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--customers", type=int, default=1000)
    ap.add_argument("--skip-generate", action="store_true")
    ap.add_argument("--use-zip", action="store_true", help="download the generator as a zip instead of using git")
    a = ap.parse_args()
    py = sys.executable
    if not a.skip_generate:
        get_generator(a.use_zip)
        if RAW.exists(): shutil.rmtree(RAW)
        run([py, "datagen.py", "-n", a.customers, "-seed", 42, "-o", RAW, "01-01-2025", "12-31-2025"], cwd=GEN)
    for step in ["load.py", "make_features.py", "cv.py", "train.py", "dimred.py", "dimred_continuous.py"]:
        run([py, ROOT / "src" / "fraud" / step])
    print("\nDone. Results: reports/results.json  |  Demo: uvicorn app.server:app --port 8000")

if __name__ == "__main__":
    main()
