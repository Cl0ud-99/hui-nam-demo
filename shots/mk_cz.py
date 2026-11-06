
import sys, os
from PIL import Image
d = sys.argv[1]
im = Image.open(os.path.join(d,"shots","corner_a.png")).convert("RGB")
w,h = im.size
c = im.crop((int(w*0.14), int(h*0.10), int(w*0.42), int(h*0.95)))
c = c.resize((int(c.width*2.2), int(c.height*2.2)), Image.LANCZOS)
c.save(os.path.join(d,"shots","corner_a_zoom.png")); print(c.size)
