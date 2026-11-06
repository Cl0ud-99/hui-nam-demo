
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
def pair(a, b, out, la="BEFORE", lb="AFTER"):
    A = Image.open(a).convert("RGB"); B = Image.open(b).convert("RGB")
    s = 0.5
    A = A.resize((int(A.width*s), int(A.height*s)), Image.LANCZOS)
    B = B.resize((int(B.width*s), int(B.height*s)), Image.LANCZOS)
    w, h = A.size
    o = Image.new("RGB", (w, h*2+44), (14,14,14))
    o.paste(A, (0, 20)); o.paste(B, (0, h+24))
    dr = ImageDraw.Draw(o)
    dr.text((8, 6), la, fill=(230,230,230)); dr.text((8, h+30), lb, fill=(230,230,230))
    o.save(out, quality=90); print(out, o.size)
pair(os.path.join(d,"shots","main_2026_11_06","03_shop_in.png"), os.path.join(d,"shots","after_03.png"), os.path.join(d,"shots","FIX_shop.jpg"))
pair(os.path.join(d,"shots","main_2026_11_06","07_bath.png"), os.path.join(d,"shots","nostool_07.png"), os.path.join(d,"shots","FIX_bath.jpg"))
pair(os.path.join(d,"shots","tap_player.png"), os.path.join(d,"shots","nostool_bath.png"), os.path.join(d,"shots","FIX_stool.jpg"))
