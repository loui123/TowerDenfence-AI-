
from PIL import Image
import os

files = ['monster_normal.png', 'monster_fire.png', 'monster_water.png', 'monster_wood.png']
base_path = 'c:/Souce/Test/public/'

def process_image(filename):
    path = os.path.join(base_path, filename)
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    img = Image.open(path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    # Heuristic: Replace white/light-gray with transparent
    # Also if corners are checkerboard?
    # Let's assume top-left pixel is background color.
    
    bg_color = datas[0] # Top-left pixel
    print(f"Processing {filename}, BG detected: {bg_color}")
    
    # Tolerance for background matching
    tol = 30
    
    for item in datas:
        # Check distance to bg_color
        dist = abs(item[0] - bg_color[0]) + abs(item[1] - bg_color[1]) + abs(item[2] - bg_color[2])
        
        # Also hardcode check for pure white or checkerboard grays
        is_white = (item[0] > 240 and item[1] > 240 and item[2] > 240)
        is_checker_gray = (abs(item[0]-item[1]) < 10 and abs(item[1]-item[2]) < 10 and item[0] > 150)
        
        if dist < tol or is_white or (is_checker_gray and item[3] > 0): 
             # If it looks like background, make transparent
             newData.append((255, 255, 255, 0))
        else:
             newData.append(item)

    img.putdata(newData)
    
    # Crop
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        # Resize to max 30x30 to fit cell? 
        # Better: keep original resolution but ensure it's tight.
        # User asked to reduce whitespace.
        print(f"  Cropped to {bbox}")
    
    img.save(path, "PNG")
    print(f"  Saved {path}")

for f in files:
    process_image(f)
