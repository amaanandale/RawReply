import os
import math
import subprocess
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

# Canvas dimensions
WIDTH = 1280
HEIGHT = 720
FPS = 30
TOTAL_FRAMES = 300  # Exactly 10.0 seconds

# Colors (Hex -> RGB)
BG_DARK = (10, 15, 29)           # Outer canvas
WIN_BG = (248, 250, 252)         # Window background
WIN_BORDER = (226, 232, 240)     # Window border
CARD_BG = (255, 255, 255)        # Card background
CARD_BORDER = (226, 232, 240)    # Card border
TEXT_PRIMARY = (15, 23, 42)      # Main text
TEXT_SECONDARY = (100, 116, 139) # Subtitle / muted
ACCENT_EMERALD = (16, 185, 129)  # Emerald green (#10B981)
ACCENT_EMERALD_DARK = (5, 150, 105) # #059669
ACCENT_PURPLE = (99, 91, 255)    # Brand purple (#635BFF)
META_BLUE = (24, 119, 242)       # Meta / Facebook blue

# Load standard Windows fonts
try:
    font_xl = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 26)
    font_lg_b = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)
    font_lg = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20)
    font_md_b = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 16)
    font_md = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 16)
    font_sm_b = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 13)
    font_sm = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 13)
    font_xs = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
    font_mono = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 14)
except Exception:
    font_xl = ImageFont.load_default()
    font_lg_b = font_lg = font_md_b = font_md = font_sm_b = font_sm = font_xs = font_mono = font_xl

def ease_in_out(t):
    return t * t * (3 - 2 * t)

def draw_cursor(draw, x, y, click=False):
    # Sleek dark/white pointer
    pts = [
        (x, y),
        (x, y + 20),
        (x + 5, y + 16),
        (x + 9, y + 25),
        (x + 13, y + 23),
        (x + 9, y + 14),
        (x + 16, y + 14),
    ]
    # Shadow
    shadow_pts = [(px + 2, py + 2) for px, py in pts]
    draw.polygon(shadow_pts, fill=(0, 0, 0, 80))
    # Fill & Outline
    draw.polygon(pts, fill=(255, 255, 255), outline=(15, 23, 42), width=1)
    if click:
        # Click ripple ring
        draw.ellipse([x - 12, y - 12, x + 12, y + 12], outline=ACCENT_EMERALD, width=2)

def draw_browser_chrome(draw, active_tab="accounts"):
    # Window shell
    wx, wy, ww, wh = 50, 30, 1180, 660
    draw.rounded_rectangle([wx, wy, wx + ww, wy + wh], radius=12, fill=WIN_BG, outline=WIN_BORDER, width=1)

    # Top title bar
    draw.rounded_rectangle([wx, wy, wx + ww, wy + 42], radius=12, fill=(241, 245, 249))
    draw.rectangle([wx, wy + 30, wx + ww, wy + 42], fill=(241, 245, 249)) # flatten bottom curve
    # Dots
    draw.ellipse([wx + 16, wy + 16, wx + 26, wy + 26], fill=(239, 68, 68))
    draw.ellipse([wx + 34, wy + 16, wx + 44, wy + 26], fill=(245, 158, 11))
    draw.ellipse([wx + 52, wy + 16, wx + 62, wy + 26], fill=(16, 185, 129))
    # URL pill
    draw.rounded_rectangle([wx + 380, wy + 10, wx + 800, wy + 34], radius=6, fill=(255, 255, 255), outline=WIN_BORDER)
    draw.text((wx + 450, wy + 13), "🔒 https://app.rawreply.io/dashboard", fill=TEXT_SECONDARY, font=font_sm)

    # RawReply App Header
    hy = wy + 42
    draw.rectangle([wx, hy, wx + ww, hy + 50], fill=(255, 255, 255), outline=WIN_BORDER, width=1)
    # Logo
    draw.rounded_rectangle([wx + 24, hy + 12, wx + 50, hy + 38], radius=6, fill=(15, 23, 42))
    draw.text((wx + 30, hy + 14), "💬", font=font_md)
    draw.text((wx + 60, hy + 15), "RawReply", fill=TEXT_PRIMARY, font=font_lg_b)

    # Workspace badge
    draw.rounded_rectangle([wx + 175, hy + 14, wx + 340, hy + 36], radius=6, fill=(241, 245, 249), outline=WIN_BORDER)
    draw.text((wx + 185, hy + 17), "🏢 Apex Growth Marketing", fill=TEXT_PRIMARY, font=font_xs)

    # Nav Links
    tabs = [
        ("Overview", "overview", wx + 440),
        ("Automations", "automations", wx + 540),
        ("Accounts", "accounts", wx + 670),
        ("Leads", "leads", wx + 770),
    ]
    for label, id_, tx in tabs:
        is_active = (id_ == active_tab)
        color = ACCENT_PURPLE if is_active else TEXT_SECONDARY
        font = font_md_b if is_active else font_md
        draw.text((tx, hy + 16), label, fill=color, font=font)
        if is_active:
            draw.line([tx, hy + 49, tx + 75, hy + 49], fill=ACCENT_PURPLE, width=2)

    # Right user avatar
    draw.ellipse([wx + ww - 44, hy + 14, wx + ww - 18, hy + 40], fill=(224, 231, 255))
    draw.text((wx + ww - 37, hy + 18), "AG", fill=ACCENT_PURPLE, font=font_sm_b)

def render_frame(frame_idx):
    t = frame_idx / FPS # Current seconds in [0, 10]
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Ambient subtle gradient background
    for y in range(0, HEIGHT, 16):
        alpha = int(20 * (1 - abs(y - HEIGHT/2) / (HEIGHT/2)))
        draw.line([0, y, WIDTH, y], fill=(10 + alpha, 20 + alpha*2, 35 + alpha*3))

    wx, wy = 50, 30

    # -------------------------------------------------------------
    # 0.0s – 2.0s: CONNECT INSTAGRAM
    # -------------------------------------------------------------
    if t < 2.0:
        draw_browser_chrome(draw, active_tab="accounts")
        # Content header
        draw.text((wx + 30, wy + 115), "Instagram Accounts", fill=TEXT_PRIMARY, font=font_xl)
        draw.text((wx + 30, wy + 152), "Connect your Instagram Business or Creator accounts via Meta Graph API v21.0", fill=TEXT_SECONDARY, font=font_sm)

        # Connect button
        btn_x, btn_y, btn_w, btn_h = wx + 960, wy + 115, 175, 40
        btn_hover = (0.5 <= t < 0.8)
        btn_click = (0.7 <= t < 0.8)
        btn_fill = (13, 148, 136) if btn_hover else ACCENT_EMERALD
        draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=8, fill=btn_fill)
        draw.text((btn_x + 22, btn_y + 11), "+ Connect Account", fill=(255, 255, 255), font=font_sm_b)

        # Before 1.3s: empty state; After 1.3s: connected account card
        if t < 1.3:
            card_x, card_y, card_w, card_h = wx + 30, wy + 195, 1105, 360
            draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=10, fill=CARD_BG, outline=CARD_BORDER)
            draw.text((card_x + card_w//2 - 130, card_y + 120), "📸 No Instagram Accounts Connected", fill=TEXT_PRIMARY, font=font_lg_b)
            draw.text((card_x + card_w//2 - 200, card_y + 160), "Link your Instagram Professional account to activate post comment listening and lead capture.", fill=TEXT_SECONDARY, font=font_sm)
        else:
            # Connected Account card
            card_x, card_y, card_w, card_h = wx + 30, wy + 195, 1105, 170
            draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=10, fill=CARD_BG, outline=ACCENT_EMERALD, width=2)
            # Profile Avatar
            draw.ellipse([card_x + 30, card_y + 35, card_x + 110, card_y + 115], fill=(236, 72, 153))
            draw.text((card_x + 55, card_y + 60), "📸", font=font_lg)
            # Info
            draw.text((card_x + 130, card_y + 40), "@business.growth", fill=TEXT_PRIMARY, font=font_xl)
            draw.text((card_x + 130, card_y + 75), "Professional Account • 48.2K Followers • Connected to Meta Graph API v21.0", fill=TEXT_SECONDARY, font=font_sm)
            # Connected badge
            draw.rounded_rectangle([card_x + 130, card_y + 108, card_x + 260, card_y + 134], radius=12, fill=(236, 253, 245), outline=ACCENT_EMERALD)
            draw.text((card_x + 145, card_y + 112), "● Active & Connected", fill=ACCENT_EMERALD_DARK, font=font_xs)
            # Toast
            draw.rounded_rectangle([wx + 750, wy + 205, wx + 1120, wy + 250], radius=8, fill=(236, 253, 245), outline=ACCENT_EMERALD)
            draw.text((wx + 765, wy + 218), "✓ Instagram Account Connected Successfully!", fill=ACCENT_EMERALD_DARK, font=font_sm_b)

        # Meta OAuth Popup Modal (0.8s - 1.3s)
        if 0.8 <= t < 1.3:
            # Dim overlay
            overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 140))
            img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))
            draw = ImageDraw.Draw(img)

            mx, my, mw, mh = 420, 160, 440, 360
            draw.rounded_rectangle([mx, my, mx + mw, my + mh], radius=12, fill=(255, 255, 255), outline=CARD_BORDER, width=2)
            # Facebook Top Header
            draw.rounded_rectangle([mx, my, mx + mw, my + 50], radius=12, fill=META_BLUE)
            draw.rectangle([mx, my + 35, mx + mw, my + 50], fill=META_BLUE)
            draw.text((mx + 20, my + 14), "f  Log in with Facebook", fill=(255, 255, 255), font=font_md_b)

            draw.text((mx + 30, my + 75), "Connect Instagram to RawReply", fill=TEXT_PRIMARY, font=font_lg_b)
            draw.text((mx + 30, my + 110), "RawReply is requesting permissions to:", fill=TEXT_SECONDARY, font=font_sm)
            draw.text((mx + 45, my + 140), "✓ Manage comments on your posts", fill=TEXT_PRIMARY, font=font_sm)
            draw.text((mx + 45, my + 168), "✓ Send direct messages to commenters", fill=TEXT_PRIMARY, font=font_sm)
            draw.text((mx + 45, my + 196), "✓ Read follower engagement metrics", fill=TEXT_PRIMARY, font=font_sm)

            # Continue button
            fb_btn_y = my + 285
            fb_click = (1.1 <= t < 1.25)
            draw.rounded_rectangle([mx + 30, fb_btn_y, mx + mw - 30, fb_btn_y + 44], radius=8, fill=(30, 64, 175) if fb_click else META_BLUE)
            draw.text((mx + 110, fb_btn_y + 12), "Continue as Apex Growth", fill=(255, 255, 255), font=font_sm_b)

        # Cursor animation
        if t < 0.8:
            prog = ease_in_out(min(1.0, t / 0.7))
            cx = 600 + (btn_x + 80 - 600) * prog
            cy = 400 + (btn_y + 20 - 400) * prog
            draw_cursor(draw, int(cx), int(cy), click=btn_click)
        elif t < 1.3:
            prog = ease_in_out(min(1.0, (t - 0.8) / 0.3))
            cx = (btn_x + 80) + ((mx + mw//2) - (btn_x + 80)) * prog
            cy = (btn_y + 20) + ((my + 305) - (btn_y + 20)) * prog
            draw_cursor(draw, int(cx), int(cy), click=(1.1 <= t < 1.25))

    # -------------------------------------------------------------
    # 2.0s – 3.0s: CREATE AUTOMATION
    # -------------------------------------------------------------
    elif t < 3.0:
        tab_to_auto = (t >= 2.3)
        draw_browser_chrome(draw, active_tab="automations" if tab_to_auto else "accounts")

        draw.text((wx + 30, wy + 115), "Automations", fill=TEXT_PRIMARY, font=font_xl)
        draw.text((wx + 30, wy + 152), "Configure comment triggers, DM questions, and phone lead capture gates.", fill=TEXT_SECONDARY, font=font_sm)

        # "+ Create Automation" button
        c_btn_x, c_btn_y, c_btn_w, c_btn_h = wx + 940, wy + 115, 195, 40
        c_click = (2.7 <= t < 2.9)
        c_fill = (13, 148, 136) if c_click else ACCENT_EMERALD
        draw.rounded_rectangle([c_btn_x, c_btn_y, c_btn_x + c_btn_w, c_btn_y + c_btn_h], radius=8, fill=c_fill)
        draw.text((c_btn_x + 18, c_btn_y + 11), "+ Create Automation", fill=(255, 255, 255), font=font_sm_b)

        # Automations list container
        card_x, card_y, card_w, card_h = wx + 30, wy + 195, 1105, 360
        draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=10, fill=CARD_BG, outline=CARD_BORDER)
        draw.text((card_x + card_w//2 - 120, card_y + 130), "⚡ No automations active", fill=TEXT_PRIMARY, font=font_lg_b)
        draw.text((card_x + card_w//2 - 210, card_y + 170), "Click 'Create Automation' above to launch your first comment-to-DM sequence.", fill=TEXT_SECONDARY, font=font_sm)

        # Cursor gliding to Automations tab then Create button
        if t < 2.3:
            prog = ease_in_out((t - 2.0) / 0.3)
            cx = (wx + 670) + ((wx + 560) - (wx + 670)) * prog
            cy = 200 + (wy + 58 - 200) * prog
            draw_cursor(draw, int(cx), int(cy), click=(t >= 2.2))
        else:
            prog = ease_in_out(min(1.0, (t - 2.3) / 0.4))
            cx = (wx + 560) + ((c_btn_x + 90) - (wx + 560)) * prog
            cy = (wy + 58) + ((c_btn_y + 20) - (wy + 58)) * prog
            draw_cursor(draw, int(cx), int(cy), click=c_click)

    # -------------------------------------------------------------
    # 3.0s – 5.0s: SELECT TRIGGER (Post & Keyword)
    # -------------------------------------------------------------
    elif t < 5.0:
        draw_browser_chrome(draw, active_tab="automations")

        # Automation Builder Step Progress Bar
        draw.text((wx + 30, wy + 110), "Automation Builder — Comment-to-DM", fill=TEXT_PRIMARY, font=font_xl)
        # Step pills
        step1_fill = ACCENT_PURPLE
        draw.rounded_rectangle([wx + 650, wy + 110, wx + 800, wy + 136], radius=12, fill=step1_fill)
        draw.text((wx + 665, wy + 114), "1. Trigger Post", fill=(255, 255, 255), font=font_xs)

        draw.rounded_rectangle([wx + 815, wy + 110, wx + 965, wy + 136], radius=12, fill=(241, 245, 249))
        draw.text((wx + 830, wy + 114), "2. Messages", fill=TEXT_SECONDARY, font=font_xs)

        draw.rounded_rectangle([wx + 980, wy + 110, wx + 1130, wy + 136], radius=12, fill=(241, 245, 249))
        draw.text((wx + 995, wy + 114), "3. Activate", fill=TEXT_SECONDARY, font=font_xs)

        draw.text((wx + 30, wy + 155), "Step 1: Choose the Instagram Post to Monitor", fill=TEXT_SECONDARY, font=font_md_b)

        # 3 Instagram Post Cards
        post2_selected = (t >= 3.6)
        posts = [
            ("Spring Collection Launch 🚀", "142 comments • 1.2K likes", (59, 130, 246), wx + 30, False),
            ("Limited Time 40% Off Offer 🔥", "389 comments • 4.8K likes", (249, 115, 22), wx + 410, post2_selected),
            ("Behind The Scenes Q&A 💡", "95 comments • 890 likes", (168, 85, 247), wx + 790, False),
        ]

        for title, stats, color, px, is_sel in posts:
            border_c = ACCENT_EMERALD if is_sel else CARD_BORDER
            border_w = 3 if is_sel else 1
            draw.rounded_rectangle([px, wy + 185, px + 345, wy + 375], radius=10, fill=CARD_BG, outline=border_c, width=border_w)
            # Image thumbnail mockup
            draw.rounded_rectangle([px + 12, wy + 197, px + 333, wy + 295], radius=8, fill=color)
            draw.text((px + 24, wy + 235), "📸 Instagram Media", fill=(255, 255, 255), font=font_md_b)

            draw.text((px + 14, wy + 310), title, fill=TEXT_PRIMARY, font=font_md_b)
            draw.text((px + 14, wy + 340), stats, fill=TEXT_SECONDARY, font=font_xs)

            if is_sel:
                draw.rounded_rectangle([px + 215, wy + 333, px + 333, wy + 360], radius=10, fill=(236, 253, 245), outline=ACCENT_EMERALD)
                draw.text((px + 225, wy + 338), "✓ Selected", fill=ACCENT_EMERALD_DARK, font=font_xs)

        # Trigger Condition Panel (bottom)
        draw.rounded_rectangle([wx + 30, wy + 395, wx + 1105, wy + 550], radius=10, fill=CARD_BG, outline=CARD_BORDER)
        draw.text((wx + 50, wy + 412), "Trigger Keyword Filter", fill=TEXT_PRIMARY, font=font_md_b)
        draw.text((wx + 50, wy + 440), "When someone comments with specific keywords, trigger automated DM flow:", fill=TEXT_SECONDARY, font=font_sm)

        # Keyword text input box
        kw_x, kw_y, kw_w, kw_h = wx + 50, wy + 475, 600, 44
        draw.rounded_rectangle([kw_x, kw_y, kw_x + kw_w, kw_y + kw_h], radius=8, fill=(248, 250, 252), outline=ACCENT_PURPLE, width=2)

        # Animate typing "PRICE"
        typed_text = ""
        if t >= 4.0:
            target_text = "PRICE, DETAILS, OFFER"
            chars = int((t - 4.0) * 20)
            typed_text = target_text[:min(len(target_text), chars)]
        draw.text((kw_x + 16, kw_y + 12), typed_text or "Type trigger keywords...", fill=TEXT_PRIMARY if typed_text else TEXT_SECONDARY, font=font_mono)

        # Cursor animation
        if t < 3.6:
            prog = ease_in_out((t - 3.0) / 0.5)
            cx = (wx + 200) + ((wx + 410 + 170) - (wx + 200)) * prog
            cy = (wy + 150) + ((wy + 280) - (wy + 150)) * prog
            draw_cursor(draw, int(cx), int(cy), click=(3.4 <= t < 3.6))
        else:
            prog = ease_in_out(min(1.0, (t - 3.6) / 0.5))
            cx = (wx + 410 + 170) + ((kw_x + 180) - (wx + 410 + 170)) * prog
            cy = (wy + 280) + ((kw_y + 22) - (wy + 280)) * prog
            draw_cursor(draw, int(cx), int(cy), click=(4.0 <= t < 4.2))

    # -------------------------------------------------------------
    # 5.0s – 7.0s: CONFIGURE COMMENT REPLY AND DM
    # -------------------------------------------------------------
    elif t < 7.0:
        draw_browser_chrome(draw, active_tab="automations")

        draw.text((wx + 30, wy + 110), "Automation Builder — Comment-to-DM", fill=TEXT_PRIMARY, font=font_xl)
        # Step pills
        draw.rounded_rectangle([wx + 650, wy + 110, wx + 800, wy + 136], radius=12, fill=(241, 245, 249))
        draw.text((wx + 665, wy + 114), "1. Trigger Post", fill=TEXT_SECONDARY, font=font_xs)

        draw.rounded_rectangle([wx + 815, wy + 110, wx + 965, wy + 136], radius=12, fill=ACCENT_PURPLE)
        draw.text((wx + 830, wy + 114), "2. Messages", fill=(255, 255, 255), font=font_xs)

        draw.rounded_rectangle([wx + 980, wy + 110, wx + 1130, wy + 136], radius=12, fill=(241, 245, 249))
        draw.text((wx + 995, wy + 114), "3. Activate", fill=TEXT_SECONDARY, font=font_xs)

        draw.text((wx + 30, wy + 155), "Step 2: Configure Public Comment Reply & Private DM", fill=TEXT_SECONDARY, font=font_md_b)

        # Left Card: Public Comment Reply (5.0s - 6.0s)
        c1_x, c1_y, c1_w, c1_h = wx + 30, wy + 190, 535, 360
        draw.rounded_rectangle([c1_x, c1_y, c1_x + c1_w, c1_y + c1_h], radius=10, fill=CARD_BG, outline=CARD_BORDER, width=1)
        # Public Action Badge
        draw.rounded_rectangle([c1_x + 20, c1_y + 18, c1_x + 240, c1_y + 44], radius=6, fill=(238, 242, 255), outline=ACCENT_PURPLE)
        draw.text((c1_x + 30, c1_y + 22), "🌐 Public Action • Comment Reply", fill=ACCENT_PURPLE, font=font_xs)

        draw.text((c1_x + 20, c1_y + 60), "Public reply to commenter under post:", fill=TEXT_PRIMARY, font=font_md_b)

        # Text input box 1
        box1_y = c1_y + 90
        draw.rounded_rectangle([c1_x + 20, box1_y, c1_x + c1_w - 20, box1_y + 80], radius=8, fill=(248, 250, 252), outline=CARD_BORDER)
        full_comment = "Thanks for your interest! Check your DM."
        c_chars = int((t - 5.0) * 35) if t >= 5.0 else 0
        drawn_comment = full_comment[:min(len(full_comment), c_chars)]
        draw.text((c1_x + 32, box1_y + 14), f'"{drawn_comment}"', fill=TEXT_PRIMARY, font=font_md)

        # Preview of comment
        draw.rounded_rectangle([c1_x + 20, box1_y + 95, c1_x + c1_w - 20, box1_y + 155], radius=8, fill=(241, 245, 249))
        draw.text((c1_x + 32, box1_y + 105), "@user_lead: PRICE please!", fill=TEXT_SECONDARY, font=font_xs)
        draw.text((c1_x + 48, box1_y + 128), "↳ @business.growth: Thanks for your interest! Check your DM.", fill=ACCENT_PURPLE, font=font_xs)

        # Right Card: Private DM Message (6.0s - 7.0s)
        c2_x = wx + 595
        draw.rounded_rectangle([c2_x, c1_y, c2_x + c1_w, c1_y + c1_h], radius=10, fill=CARD_BG, outline=ACCENT_EMERALD if t >= 6.0 else CARD_BORDER, width=2 if t >= 6.0 else 1)
        # Private Action Badge
        draw.rounded_rectangle([c2_x + 20, c1_y + 18, c2_x + 240, c1_y + 44], radius=6, fill=(236, 253, 245), outline=ACCENT_EMERALD)
        draw.text((c2_x + 30, c1_y + 22), "🔒 Private Action • Instagram DM", fill=ACCENT_EMERALD_DARK, font=font_xs)

        draw.text((c2_x + 20, c1_y + 60), "Automated Direct Message (DM Flow):", fill=TEXT_PRIMARY, font=font_md_b)

        # Text input box 2
        draw.rounded_rectangle([c2_x + 20, box1_y, c2_x + c1_w - 20, box1_y + 80], radius=8, fill=(248, 250, 252), outline=ACCENT_EMERALD if t >= 6.0 else CARD_BORDER)
        full_dm = "Hi! Thanks for commenting. Please share your mobile number so our team can contact you."
        dm_chars = int((t - 6.0) * 45) if t >= 6.0 else 0
        drawn_dm = full_dm[:min(len(full_dm), dm_chars)]
        # Word wrap manually
        line1 = drawn_dm[:48]
        line2 = drawn_dm[48:]
        draw.text((c2_x + 32, box1_y + 12), f'"{line1}', fill=TEXT_PRIMARY, font=font_sm)
        if line2:
            draw.text((c2_x + 32, box1_y + 36), f'{line2}"', fill=TEXT_PRIMARY, font=font_sm)

        # DM chat bubble preview
        draw.rounded_rectangle([c2_x + 20, box1_y + 95, c2_x + c1_w - 20, box1_y + 155], radius=8, fill=(236, 253, 245), outline=ACCENT_EMERALD)
        draw.text((c2_x + 32, box1_y + 105), "💬 Direct Message Sent Instantly", fill=ACCENT_EMERALD_DARK, font=font_xs)
        draw.text((c2_x + 32, box1_y + 128), "📱 Phone Number Gate: Captures verified contact info", fill=TEXT_PRIMARY, font=font_xs)

        # Cursor animation
        if t < 6.0:
            cx = c1_x + 100 + (t - 5.0) * 120
            cy = box1_y + 40
            draw_cursor(draw, int(cx), int(cy))
        else:
            cx = c2_x + 100 + (t - 6.0) * 120
            cy = box1_y + 40
            draw_cursor(draw, int(cx), int(cy))

    # -------------------------------------------------------------
    # 7.0s – 9.0s: PUBLISH AUTOMATION & FLOW DIAGRAM
    # -------------------------------------------------------------
    elif t < 9.0:
        draw_browser_chrome(draw, active_tab="automations")

        draw.text((wx + 30, wy + 110), "Automation Builder — Final Review", fill=TEXT_PRIMARY, font=font_xl)
        # Step pills
        draw.rounded_rectangle([wx + 650, wy + 110, wx + 800, wy + 136], radius=12, fill=(241, 245, 249))
        draw.text((wx + 665, wy + 114), "1. Trigger Post", fill=TEXT_SECONDARY, font=font_xs)

        draw.rounded_rectangle([wx + 815, wy + 110, wx + 965, wy + 136], radius=12, fill=(241, 245, 249))
        draw.text((wx + 830, wy + 114), "2. Messages", fill=TEXT_SECONDARY, font=font_xs)

        draw.rounded_rectangle([wx + 980, wy + 110, wx + 1130, wy + 136], radius=12, fill=ACCENT_EMERALD)
        draw.text((wx + 995, wy + 114), "3. Activate ✓", fill=(255, 255, 255), font=font_xs)

        draw.text((wx + 30, wy + 155), "Step 3: Complete Automated Journey Flow", fill=TEXT_SECONDARY, font=font_md_b)

        # Visual Flow Diagram Card (Wide)
        flow_y = wy + 195
        draw.rounded_rectangle([wx + 30, flow_y, wx + 1105, flow_y + 240], radius=12, fill=CARD_BG, outline=CARD_BORDER)

        nodes = [
            ("1. Post Trigger", "Limited 40% Off", wx + 70),
            ("2. Keyword Match", '"PRICE"', wx + 340),
            ("3. Public Reply", '"Check DM"', wx + 610),
            ("4. Private Lead Gate", "Verified Mobile", wx + 880),
        ]

        # Draw connecting glowing arrows
        for i in range(len(nodes) - 1):
            n1_x = nodes[i][2] + 160
            n2_x = nodes[i+1][2]
            arrow_y = flow_y + 110
            draw.line([n1_x, arrow_y, n2_x, arrow_y], fill=ACCENT_EMERALD, width=3)
            # Arrowhead
            draw.polygon([(n2_x, arrow_y), (n2_x - 10, arrow_y - 6), (n2_x - 10, arrow_y + 6)], fill=ACCENT_EMERALD)

        # Draw Nodes
        for title, sub, nx in nodes:
            draw.rounded_rectangle([nx, flow_y + 50, nx + 160, flow_y + 170], radius=10, fill=(248, 250, 252), outline=ACCENT_EMERALD, width=2)
            draw.text((nx + 18, flow_y + 75), title, fill=TEXT_PRIMARY, font=font_sm_b)
            draw.text((nx + 18, flow_y + 115), sub, fill=ACCENT_PURPLE, font=font_sm)

        # Bottom Action Bar
        bar_y = flow_y + 265
        draw.rounded_rectangle([wx + 30, bar_y, wx + 1105, bar_y + 80], radius=10, fill=CARD_BG, outline=CARD_BORDER)
        draw.text((wx + 60, bar_y + 28), "Ready to launch: Comment listening will activate immediately on Instagram.", fill=TEXT_SECONDARY, font=font_sm)

        # "Publish Automation" button
        pub_btn_x, pub_btn_y, pub_btn_w, pub_btn_h = wx + 880, bar_y + 18, 220, 44
        pub_click = (8.2 <= t < 8.4)
        draw.rounded_rectangle([pub_btn_x, pub_btn_y, pub_btn_x + pub_btn_w, pub_btn_y + pub_btn_h], radius=8, fill=(13, 148, 136) if pub_click else ACCENT_EMERALD)
        draw.text((pub_btn_x + 28, pub_btn_y + 12), "Publish Automation 🚀", fill=(255, 255, 255), font=font_md_b)

        # Success Banner flies in (8.4s - 9.0s)
        if t >= 8.4:
            b_top = wy + 42
            draw.rounded_rectangle([wx + 300, b_top + 10, wx + 880, b_top + 60], radius=8, fill=(16, 185, 129), outline=(5, 150, 105))
            draw.text((wx + 360, b_top + 22), "✓ Automation Activated! Now listening for Instagram comments.", fill=(255, 255, 255), font=font_md_b)

        # Cursor gliding to Publish Automation
        prog = ease_in_out(min(1.0, (t - 7.0) / 1.1))
        cx = 500 + ((pub_btn_x + 110) - 500) * prog
        cy = 400 + ((pub_btn_y + 22) - 400) * prog
        draw_cursor(draw, int(cx), int(cy), click=pub_click)

    # -------------------------------------------------------------
    # 9.0s – 10.0s: FINAL RESULT & HERO CALLOUT
    # -------------------------------------------------------------
    else:
        draw_browser_chrome(draw, active_tab="automations")

        # Active automations dashboard in background
        draw.text((wx + 30, wy + 115), "Automations", fill=TEXT_PRIMARY, font=font_xl)
        row_y = wy + 180
        draw.rounded_rectangle([wx + 30, row_y, wx + 1105, row_y + 110], radius=10, fill=CARD_BG, outline=ACCENT_EMERALD, width=2)
        draw.text((wx + 60, row_y + 25), "Limited Time 40% Off Offer 🔥", fill=TEXT_PRIMARY, font=font_lg_b)
        draw.text((wx + 60, row_y + 60), "Trigger: Comments containing 'PRICE' • Account: @business.growth", fill=TEXT_SECONDARY, font=font_sm)

        # Active badge
        draw.rounded_rectangle([wx + 920, row_y + 35, wx + 1060, row_y + 70], radius=16, fill=(236, 253, 245), outline=ACCENT_EMERALD)
        draw.text((wx + 945, row_y + 44), "● Active", fill=ACCENT_EMERALD_DARK, font=font_md_b)

        # Sleek Glassmorphism Hero Overlay Banner
        box_w, box_h = 760, 220
        box_x = (WIDTH - box_w) // 2
        box_y = (HEIGHT - box_h) // 2

        # Card shadow
        draw.rounded_rectangle([box_x - 3, box_y - 3, box_x + box_w + 3, box_y + box_h + 3], radius=18, fill=(16, 185, 129))
        draw.rounded_rectangle([box_x, box_y, box_x + box_w, box_y + box_h], radius=16, fill=(15, 23, 42))

        # Verified badge & headline
        draw.text((box_x + box_w//2 - 190, box_y + 35), "⚡ Instagram Automation Ready", fill=ACCENT_EMERALD, font=font_md_b)
        draw.text((box_x + box_w//2 - 275, box_y + 75), "Your Instagram Automation Is Ready.", fill=(255, 255, 255), font=font_xl)
        draw.text((box_x + box_w//2 - 285, box_y + 130), "Turn Instagram comments into qualified leads automatically.", fill=(203, 213, 225), font=font_lg)

    return img

def main():
    os.makedirs("public/videos", exist_ok=True)
    video_path = "public/videos/product-demo.mp4"
    poster_path = "public/videos/product-demo-poster.jpg"

    exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        exe, "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-profile:v", "high",
        "-level", "4.0",
        "-preset", "fast",
        "-crf", "20",
        "-movflags", "+faststart",
        video_path
    ]

    print(f"Generating {TOTAL_FRAMES} frames ({TOTAL_FRAMES/FPS:.1f}s) at {FPS} FPS...")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)

    poster_saved = False
    for i in range(TOTAL_FRAMES):
        frame = render_frame(i)

        # Save poster image at frame 230 (Scene 5: visual flow diagram)
        if i == 230 and not poster_saved:
            frame.save(poster_path, "JPEG", quality=92)
            poster_saved = True

        proc.stdin.write(frame.tobytes())
        if (i + 1) % 50 == 0:
            print(f"Rendered {i + 1}/{TOTAL_FRAMES} frames...")

    proc.stdin.close()
    proc.wait()

    if proc.returncode != 0:
        err = proc.stderr.read().decode()
        print("FFmpeg error:", err)
        raise RuntimeError("FFmpeg failed to encode video")

    size_mb = os.path.getsize(video_path) / (1024 * 1024)
    print(f"✅ Video created successfully: {video_path} ({size_mb:.2f} MB)")
    print(f"✅ Poster created successfully: {poster_path}")

if __name__ == "__main__":
    main()

