
import sys, os
from PIL import Image
d = sys.argv[1]
for name, box in [("tap_i",(0.34,0.62,0.62,0.94)), ("tap_j",(0.38,0.56,0.70,0.94))]:
    im = Image.open(os.path.join(d,"shots",name+".png")).convert("RGB")
    w,h = im.size
    b = (int(w*box[0]), int(h*box[1]), int(w*box[2]), int(h*box[3]))
    c = im.crop(b); c = c.resize((int(c.width*2.0), int(c.height*2.0)), Image.LANCZOS)
    c.save(os.path.join(d,"shots",name+"_zoom.png")); print(name, c.size)
