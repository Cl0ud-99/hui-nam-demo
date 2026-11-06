
import sys, os
from PIL import Image
d = sys.argv[1]
im = Image.open(os.path.join(d,"shots","corner_user3.png")).convert("RGB")
w,h = im.size
b = (int(w*0.34), int(h*0.10), int(w*0.46), int(h*0.90))
c = im.crop(b); c = c.resize((c.width*4, c.height*4), Image.LANCZOS)
c.save(os.path.join(d,"shots","corner_user3_zoom.png")); print(c.size)
