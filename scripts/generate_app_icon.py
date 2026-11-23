#!/usr/bin/env python3
"""
scripts/generate_app_icon.py

Generates production-grade icons for RawReply based on the official 3D logo icon badge:
- Multi-resolution assets:
  * app/icon.png (512x512)
  * app/favicon.ico (16, 32, 48, 64)
  * public/favicon.png (512x512)
  * public/icon-192.png (192x192)
  * public/logo.png (1024x1024)
  * public/meta-app-icon-1024.png (1024x1024 for Meta Developer Portal)
  * public/icon.svg (SVG vector/image asset)
"""

import os
import base64
from PIL import Image

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_dir = os.path.join(base_dir, "app")
    public_dir = os.path.join(base_dir, "public")
    os.makedirs(public_dir, exist_ok=True)
    os.makedirs(app_dir, exist_ok=True)

    cutout_path = os.path.join(public_dir, "medallion_cutout_clean.png")
    if not os.path.exists(cutout_path):
        print(f"Error: {cutout_path} not found.")
        return

    cutout = Image.open(cutout_path).convert("RGBA")
    bbox = cutout.getbbox()
    tight = cutout.crop(bbox)
    tw, th = tight.size

    def make_square_icon(target_size, padding_ratio=0.04):
        canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        avail_size = int(target_size * (1.0 - padding_ratio * 2))
        scale = avail_size / max(tw, th)
        nw = int(tw * scale)
        nh = int(th * scale)
        resized = tight.resize((nw, nh), Image.Resampling.LANCZOS)
        offset_x = (target_size - nw) // 2
        offset_y = (target_size - nh) // 2
        canvas.paste(resized, (offset_x, offset_y), resized)
        return canvas

    # 1. 1024x1024 Master for Meta Developer Portal
    icon_1024 = make_square_icon(1024)
    meta_path = os.path.join(public_dir, "meta-app-icon-1024.png")
    icon_1024.save(meta_path, "PNG", optimize=True)
    logo_path = os.path.join(public_dir, "logo.png")
    icon_1024.save(logo_path, "PNG", optimize=True)
    print(f"Generated: {meta_path} (1024x1024)")

    # 2. 512x512 Next.js App Icon & Favicon
    icon_512 = make_square_icon(512)
    app_icon_path = os.path.join(app_dir, "icon.png")
    public_favicon_path = os.path.join(public_dir, "favicon.png")
    icon_512.save(app_icon_path, "PNG", optimize=True)
    icon_512.save(public_favicon_path, "PNG", optimize=True)
    print(f"Generated: {app_icon_path} (512x512)")

    # 3. 192x192 PWA Icon
    icon_192 = make_square_icon(192)
    icon_192_path = os.path.join(public_dir, "icon-192.png")
    icon_192.save(icon_192_path, "PNG", optimize=True)
    print(f"Generated: {icon_192_path} (192x192)")

    # 4. Multi-resolution favicon.ico
    ico_path = os.path.join(app_dir, "favicon.ico")
    icon_512.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print(f"Generated: {ico_path} (multi-res ICO: 16, 32, 48, 64)")

    # 5. SVG
    with open(public_favicon_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <!-- RawReply Official 3D Medallion Logo -->
  <image href="data:image/png;base64,{b64}" width="512" height="512" />
</svg>
'''
    svg_path = os.path.join(public_dir, "icon.svg")
    with open(svg_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print(f"Generated: {svg_path}")

if __name__ == "__main__":
    main()
