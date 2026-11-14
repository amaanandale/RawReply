#!/usr/bin/env python3
"""
scripts/generate_app_icon.py

Generates production-grade icons for RawReply:
- Emerald green background (#10B981)
- Crisp white speech bubble
- Elegant reply arrow / letter 'R' geometric icon
- Multi-resolution assets:
  * app/icon.png (512x512)
  * app/favicon.ico (16, 32, 48)
  * public/favicon.png (512x512)
  * public/icon-192.png (192x192)
  * public/icon-512.png (512x512)
  * public/meta-app-icon-1024.png (1024x1024 for Meta Developer Portal)
"""

import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_rawreply_icon(size=1024):
    # Render at 2x for supersampling / ultra-smooth anti-aliasing
    scale = 2
    canvas_size = size * scale
    
    # 1. Canvas with rich Emerald Green background
    # #10B981 is RGB(16, 185, 129)
    bg_color = (16, 185, 129, 255)
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer squircle / rounded rect for app icon
    # Corner radius ~ 22% of canvas size
    radius = int(canvas_size * 0.22)
    draw.rounded_rectangle(
        [(0, 0), (canvas_size - 1, canvas_size - 1)],
        radius=radius,
        fill=bg_color
    )
    
    # 2. White Speech Bubble
    # Center speech bubble horizontally and slightly above vertical center
    bubble_w = int(canvas_size * 0.70)
    bubble_h = int(canvas_size * 0.56)
    bubble_left = (canvas_size - bubble_w) // 2
    bubble_top = int(canvas_size * 0.16)
    bubble_right = bubble_left + bubble_w
    bubble_bottom = bubble_top + bubble_h
    bubble_radius = int(canvas_size * 0.16)
    
    # Draw bubble body
    draw.rounded_rectangle(
        [(bubble_left, bubble_top), (bubble_right, bubble_bottom)],
        radius=bubble_radius,
        fill=(255, 255, 255, 255)
    )
    
    # Speech bubble tail pointing bottom-left
    tail_top_y = bubble_bottom - int(canvas_size * 0.05)
    tail_p1 = (bubble_left + int(bubble_w * 0.18), tail_top_y)
    tail_p2 = (bubble_left + int(bubble_w * 0.40), tail_top_y)
    tail_p3 = (bubble_left + int(bubble_w * 0.12), bubble_bottom + int(canvas_size * 0.16))
    
    # Draw smooth triangular/curved tail
    draw.polygon([tail_p1, tail_p2, tail_p3], fill=(255, 255, 255, 255))
    
    # Smooth circle at tail tip for softness
    tip_radius = int(canvas_size * 0.025)
    draw.ellipse(
        [
            (tail_p3[0] - tip_radius, tail_p3[1] - tip_radius),
            (tail_p3[0] + tip_radius, tail_p3[1] + tip_radius)
        ],
        fill=(255, 255, 255, 255)
    )
    
    # 3. Inside Symbol: Elegant Reply Arrow forming the letter 'R'
    # Primary accent color for symbol inside bubble:
    # Rich emerald #059669
    symbol_color = (5, 150, 105, 255)
    
    # Center of bubble content area
    cx = (bubble_left + bubble_right) // 2
    cy = (bubble_top + bubble_bottom) // 2
    
    stroke_w = int(canvas_size * 0.065) # Strong bold stroke
    
    # Geometry of the 'R' Reply Arrow:
    # Left vertical stem of 'R'
    stem_x = cx - int(bubble_w * 0.20)
    stem_top_y = cy - int(bubble_h * 0.28)
    stem_bottom_y = cy + int(bubble_h * 0.28)
    
    # Rounded line for stem
    draw.line(
        [(stem_x, stem_top_y), (stem_x, stem_bottom_y)],
        fill=symbol_color,
        width=stroke_w
    )
    # Caps on stem
    cap_r = stroke_w // 2
    draw.ellipse([(stem_x - cap_r, stem_top_y - cap_r), (stem_x + cap_r, stem_top_y + cap_r)], fill=symbol_color)
    draw.ellipse([(stem_x - cap_r, stem_bottom_y - cap_r), (stem_x + cap_r, stem_bottom_y + cap_r)], fill=symbol_color)
    
    # Upper loop of 'R' + Reply sweep
    loop_right_x = cx + int(bubble_w * 0.16)
    loop_top_y = stem_top_y
    loop_mid_y = cy - int(bubble_h * 0.01)
    
    loop_bbox = [
        (stem_x - stroke_w // 2, loop_top_y),
        (loop_right_x, loop_mid_y)
    ]
    # Draw arc from 270 (top) to 90 (bottom) clockwise
    draw.arc(loop_bbox, start=270, end=90, fill=symbol_color, width=stroke_w)
    
    # Horizontal top connection of R
    draw.line([(stem_x, loop_top_y), (cx, loop_top_y)], fill=symbol_color, width=stroke_w)
    # Horizontal middle connection of R
    draw.line([(stem_x, loop_mid_y), (cx, loop_mid_y)], fill=symbol_color, width=stroke_w)
    
    # Diagonal leg of 'R' curving out to the right
    leg_start = (cx + int(bubble_w * 0.02), loop_mid_y)
    leg_end = (cx + int(bubble_w * 0.22), stem_bottom_y)
    draw.line([leg_start, leg_end], fill=symbol_color, width=stroke_w)
    draw.ellipse([(leg_end[0] - cap_r, leg_end[1] - cap_r), (leg_end[0] + cap_r, leg_end[1] + cap_r)], fill=symbol_color)
    
    # Reply Arrowhead pointing left toward the stem top:
    # A sleek left-pointing chevron on top representing "Reply"
    arrow_tip_x = stem_x - int(bubble_w * 0.08)
    arrow_tip_y = stem_top_y
    arrow_arm = int(canvas_size * 0.07)
    
    # Arrow top arm
    draw.line(
        [(arrow_tip_x, arrow_tip_y), (arrow_tip_x + arrow_arm, arrow_tip_y - arrow_arm)],
        fill=symbol_color,
        width=int(stroke_w * 0.85)
    )
    # Arrow bottom arm
    draw.line(
        [(arrow_tip_x, arrow_tip_y), (arrow_tip_x + arrow_arm, arrow_tip_y + arrow_arm)],
        fill=symbol_color,
        width=int(stroke_w * 0.85)
    )
    
    # Downsample using high-quality LANCZOS resampling
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_dir = os.path.join(base_dir, "app")
    public_dir = os.path.join(base_dir, "public")
    os.makedirs(public_dir, exist_ok=True)
    
    print("Generating RawReply production icon assets...")
    
    # 1. 1024x1024 Master Icon for Meta Developer Portal
    icon_1024 = create_rawreply_icon(1024)
    meta_path = os.path.join(public_dir, "meta-app-icon-1024.png")
    icon_1024.save(meta_path, "PNG", optimize=True)
    print(f"Generated: {meta_path} (1024x1024)")
    
    # 2. 512x512 Next.js App Icon & Public Favicon
    icon_512 = icon_1024.resize((512, 512), Image.Resampling.LANCZOS)
    app_icon_path = os.path.join(app_dir, "icon.png")
    public_icon_path = os.path.join(public_dir, "favicon.png")
    icon_512.save(app_icon_path, "PNG", optimize=True)
    icon_512.save(public_icon_path, "PNG", optimize=True)
    print(f"Generated: {app_icon_path} (512x512)")
    print(f"Generated: {public_icon_path} (512x512)")
    
    # 3. 192x192 PWA Icon
    icon_192 = icon_1024.resize((192, 192), Image.Resampling.LANCZOS)
    icon_192_path = os.path.join(public_dir, "icon-192.png")
    icon_192.save(icon_192_path, "PNG", optimize=True)
    print(f"Generated: {icon_192_path} (192x192)")
    
    # 4. Multi-resolution favicon.ico for app/favicon.ico
    # Windows/browser ICO format supports multiple sizes in one file
    ico_path = os.path.join(app_dir, "favicon.ico")
    icon_512.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
    )
    print(f"Generated: {ico_path} (multi-res ICO: 16, 32, 48, 64)")
    
    print("All icon assets generated successfully!")

if __name__ == "__main__":
    main()
