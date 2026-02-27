import urllib.request
import os

files = [
    ('melee_tower.png', 'https://craftpix.net/wp-content/uploads/2021/01/Free-Tower-Defense-2D-Pixel-Art-Asset-Pack-5.png'),
    ('projectile_tower.png', 'https://craftpix.net/wp-content/uploads/2021/01/Free-Tower-Defense-2D-Pixel-Art-Asset-Pack-6.png'),
    ('slow_tower.png', 'https://craftpix.net/wp-content/uploads/2021/01/Free-Tower-Defense-2D-Pixel-Art-Asset-Pack-4.png'),
    ('aoe_tower.png', 'https://craftpix.net/wp-content/uploads/2021/01/Free-Tower-Defense-2D-Pixel-Art-Asset-Pack-7.png'),
    ('support_tower.png', 'https://craftpix.net/wp-content/uploads/2021/01/Free-Tower-Defense-2D-Pixel-Art-Asset-Pack-1.png')
]

for filename, url in files:
    path = f"public/{filename}"
    try:
        urllib.request.urlretrieve(url, path)
        print(f"Downloaded {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")
