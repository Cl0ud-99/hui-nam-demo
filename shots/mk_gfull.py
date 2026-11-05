
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
items = [("pass5/06_altar.png","BEFORE"),("grain_test2.png","v2 default (grain .07)"),("grain_tv.png","v3 TV (grain .10)")]
ims=[(Image.open(os.path.join(d,"shots",p)).convert("RGB"),t) for p,t in items]
w,h=ims[0][0].size; sx=0.52; aw,ah=int(w*sx),int(h*sx)
out=Image.new("RGB",(aw, ah*3+40),(10,10,10))
dr=ImageDraw.Draw(out)
for i,(im,t) in enumerate(ims):
    out.paste(im.resize((aw,ah),Image.LANCZOS),(0,i*(ah+13)+13)); dr.text((6,i*(ah+13)+1),t,fill=(240,240,240))
out.save(os.path.join(d,"shots","grain_full_compare.jpg"),quality=88)
print(out.size)
