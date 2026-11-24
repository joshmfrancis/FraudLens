"""Remove the slides listed in DROP (positions in the full 20-slide build) from the Final deck. Run after build_final.js: python decks/trim_final.py decks/out/Fraud_Detection_Final.pptx"""
import sys
from pptx import Presentation
DROP = {2, 3, 6, 7, 10, 15, 16, 17, 18, 20}
path = sys.argv[1]; prs = Presentation(path); ids = prs.slides._sldIdLst
for i, sid in reversed(list(enumerate(list(ids), 1))):
    if i in DROP:
        prs.part.drop_rel(sid.rId); ids.remove(sid)
prs.save(path); print("slides now", len(prs.slides))
