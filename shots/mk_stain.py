
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
def strip(a, b, box, out, la="BEFORE", lb="AFTER"):
    A = Image.open(a).convert("RGB").crop(box); B = Image.open(b).convert("RGB").crop(box)
    w,h = A.size
    o = Image.new("RGB", (w*2+12, h+22), (14,14,14))
    o.paste(A, (0,20)); o.paste(B, (w+12,20))
    dr = ImageDraw.Draw(o); dr.text((4,6), la, fill=(230,230,230)); dr.text((w+16,6), lb, fill=(230,230,230))
    o.save(out, quality=92); print(out, o.size)
S = os.path.join(d,"shots")
strip(os.path.join(S,"main_2026_11_06","01_alley_wide.png"), os.path.join(S,"it6_alley.png"), (0,180,760,760), os.path.join(S,"CMP_stain_alley.jpg"))
strip(os.path.join(S,"nostool_07.png"), os.path.join(S,"it6_bath.png"), (0,60,700,700), os.path.join(S,"CMP_stain_bath.jpg"))
