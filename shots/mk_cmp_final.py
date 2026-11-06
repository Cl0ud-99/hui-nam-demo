
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]; S = os.path.join(d,"shots")
def cmp(a,b,out,crop=None):
    A=Image.open(a).convert("RGB"); B=Image.open(b).convert("RGB")
    if crop: A=A.crop(crop); B=B.crop(crop)
    A=A.resize((800,450),Image.LANCZOS); B=B.resize((800,450),Image.LANCZOS)
    o=Image.new("RGB",(800,930),(14,14,14)); o.paste(A,(0,18)); o.paste(B,(0,468))
    dr=ImageDraw.Draw(o); dr.text((6,4),"BEFORE",fill=(235,235,235)); dr.text((6,454),"AFTER",fill=(235,235,235))
    o.save(out,quality=92); print("ok",out)
cmp(os.path.join(S,"main_2026_11_06","03_shop_in.png"), os.path.join(S,"it4_far.png"), os.path.join(S,"CMP_labels.jpg"))
cmp(os.path.join(S,"main_2026_11_06","02_shopfront.png"), os.path.join(S,"it5_after.png"), os.path.join(S,"CMP_shopfront.jpg"))
