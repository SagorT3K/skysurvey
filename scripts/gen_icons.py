"""Regenerate the glossy 3D-style SVG icons (mockup-matching metallic lavender set)."""
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

DEFS = """
  <linearGradient id="mtl" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f0eefb"/><stop offset="0.55" stop-color="#b7b0dc"/><stop offset="1" stop-color="#7d74ab"/>
  </linearGradient>
  <linearGradient id="mtlD" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#9c94c6"/><stop offset="1" stop-color="#5a5384"/>
  </linearGradient>
  <linearGradient id="pur" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c3a7f8"/><stop offset="1" stop-color="#7452cf"/>
  </linearGradient>
  <linearGradient id="purD" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8f74d2"/><stop offset="1" stop-color="#523b96"/>
  </linearGradient>
  <linearGradient id="grn" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#9df3c0"/><stop offset="1" stop-color="#359e67"/>
  </linearGradient>
  <linearGradient id="grnD" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#57c48b"/><stop offset="1" stop-color="#1e7a4c"/>
  </linearGradient>
  <linearGradient id="navy" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#575f8a"/><stop offset="1" stop-color="#2c3052"/>
  </linearGradient>
  <filter id="sh" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation="1.6"/>
  </filter>
"""

def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>{DEFS}</defs>{body}</svg>'

def shadow(cx=32, cy=59, rx=17, ry=3.5, op=0.25):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#000" opacity="{op}" filter="url(#sh)"/>'

def hl(cx, cy, rx, ry, op=0.5, rot=0):
    t = f' transform="rotate({rot} {cx} {cy})"' if rot else ""
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff" opacity="{op}"{t}/>'

icons = {}

# ---- wallet-card icons -----------------------------------------------------
icons["coins"] = svg(shadow() + f"""
  <g>
    <rect x="24" y="38" width="26" height="7" rx="3" fill="url(#mtlD)"/>
    <ellipse cx="37" cy="38" rx="13" ry="4.6" fill="url(#mtl)"/>
    <rect x="24" y="32" width="26" height="7" rx="3" fill="url(#mtlD)"/>
    <ellipse cx="37" cy="32" rx="13" ry="4.6" fill="url(#mtl)"/>
    <rect x="24" y="26" width="26" height="7" rx="3" fill="url(#mtlD)"/>
    <ellipse cx="37" cy="26" rx="13" ry="4.6" fill="url(#mtl)"/>
    <ellipse cx="37" cy="26" rx="8.5" ry="2.8" fill="none" stroke="#665e96" stroke-width="1" opacity="0.7"/>
    {hl(32, 24.6, 6, 1.4, 0.65)}
  </g>
  <circle cx="17" cy="41" r="12.5" fill="url(#mtl)"/>
  <circle cx="17" cy="41" r="9.5" fill="url(#mtlD)"/>
  <circle cx="17" cy="41" r="9.5" fill="none" stroke="#4d4676" stroke-width="0.8" opacity="0.6"/>
  <text x="17" y="46.5" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="15" fill="#f4f2ff">$</text>
  {hl(12.5, 34.5, 4.5, 2.2, 0.6, -30)}
""")

icons["wallet"] = svg(shadow() + f"""
  <g transform="rotate(-6 24 18)">
    <rect x="14" y="8" width="20" height="24" rx="2.5" fill="url(#grn)" stroke="#1e7a4c" stroke-width="1.2"/>
    <circle cx="24" cy="20" r="4" fill="none" stroke="#1e7a4c" stroke-width="1" opacity="0.8"/>
    <rect x="19" y="4" width="20" height="24" rx="2.5" fill="url(#grn)" stroke="#1e7a4c" stroke-width="1.2"/>
    <circle cx="29" cy="16" r="4" fill="none" stroke="#1e7a4c" stroke-width="1" opacity="0.8"/>
  </g>
  <rect x="9" y="24" width="46" height="30" rx="7" fill="url(#pur)"/>
  <rect x="9" y="24" width="46" height="30" rx="7" fill="none" stroke="#4c3794" stroke-width="1" opacity="0.55"/>
  {hl(24, 28, 14, 2.6, 0.45)}
  <path d="M55 32 h-12 a6.5 6.5 0 0 0 0 13 h12 z" fill="url(#purD)"/>
  <circle cx="46.5" cy="38.5" r="3.4" fill="#ece8fb"/>
  <circle cx="46.5" cy="38.5" r="1.6" fill="#5c45a4"/>
""")

icons["gift"] = svg(shadow() + f"""
  <rect x="14" y="30" width="34" height="25" rx="3.5" fill="url(#pur)"/>
  <rect x="27.5" y="30" width="7" height="25" fill="url(#purD)"/>
  <rect x="11" y="21" width="40" height="10" rx="3" fill="url(#mtl)"/>
  <rect x="27.5" y="21" width="7" height="10" fill="#8d84bb"/>
  <path d="M32 20 C 24 20 20 15 23 11.5 C 26 8.5 31 12 32 20 Z" fill="url(#pur)"/>
  <path d="M32 20 C 40 20 44 15 41 11.5 C 38 8.5 33 12 32 20 Z" fill="url(#pur)"/>
  <circle cx="32" cy="19.5" r="2.6" fill="url(#mtlD)"/>
  {hl(22, 25, 8, 1.6, 0.5)}
  <circle cx="47" cy="48" r="10" fill="url(#grn)"/>
  <circle cx="47" cy="48" r="10" fill="none" stroke="#1e7a4c" stroke-width="1" opacity="0.5"/>
  <path d="M42.5 48 l3.2 3.4 l6 -6.6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
""")

icons["tap"] = svg(shadow(30, 59, 13, 3) + f"""
  <path d="M23 20 a11 11 0 0 1 18 0" fill="none" stroke="url(#mtl)" stroke-width="3" stroke-linecap="round"/>
  <path d="M27.5 24.5 a5.5 5.5 0 0 1 9 0" fill="none" stroke="url(#mtl)" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>
  <rect x="28" y="26" width="8" height="17" rx="4" fill="url(#mtl)"/>
  <path d="M28 38 c-4 2 -7 6 -4.5 10.5 c2 3.8 6.5 5 12 4.4 c6.5 -0.7 10.5 -3.4 10.5 -8.5 v-6 c0 -2.4 -3.4 -2.9 -4.6 -0.9 c-0.5 -2.3 -3.6 -2.5 -4.7 -0.5 c-0.7 -2.1 -3.7 -2.1 -4.7 -0.2 l0 -1.8 z" fill="url(#pur)"/>
  <circle cx="32" cy="27" r="2.2" fill="#8d84bb"/>
  {hl(30.5, 29, 1.8, 5, 0.5)}
""")

icons["flame"] = svg(shadow(32, 59, 12, 3) + f"""
  <path d="M32 6 C 36 14 46 18 46 32 a14 15 0 0 1 -28 0 c0 -8 5 -11 8 -17 c2 5 6 6 6 6 z" fill="url(#grn)"/>
  <path d="M32 26 c3 4 8 6 8 12 a8 8.6 0 0 1 -16 0 c0 -5 4 -7 8 -12 z" fill="url(#grnD)"/>
  {hl(26, 26, 3, 6, 0.5, -18)}
""")

# ---- survey category icons -------------------------------------------------
icons["bag"] = svg(shadow(32, 59, 15, 3.5) + f"""
  <path d="M17 22 h30 l4 30 a4 4 0 0 1 -4 4 h-30 a4 4 0 0 1 -4 -4 z" fill="url(#pur)" transform="translate(0 -1)"/>
  <path d="M23 24 v-4 a9 9 0 0 1 18 0 v4" fill="none" stroke="url(#mtl)" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M13 34 h38" stroke="#5a41a8" stroke-width="1.2" opacity="0.6"/>
  {hl(25, 30, 7, 2.4, 0.4, -8)}
  <circle cx="40" cy="42" r="7.5" fill="url(#grn)"/>
  <circle cx="40" cy="42" r="7.5" fill="none" stroke="#1e7a4c" stroke-width="1" opacity="0.5"/>
  <circle cx="40" cy="42" r="2.6" fill="none" stroke="#fff" stroke-width="1.8"/>
""")

icons["laptop"] = svg(shadow() + f"""
  <rect x="14" y="12" width="36" height="26" rx="3.5" fill="url(#mtl)"/>
  <rect x="17" y="15" width="30" height="20" rx="2" fill="url(#navy)"/>
  <rect x="20" y="18" width="12" height="2.4" rx="1.2" fill="#a99ee6" opacity="0.9"/>
  <rect x="20" y="23" width="20" height="2.4" rx="1.2" fill="#7a72ae" opacity="0.8"/>
  <rect x="20" y="28" width="16" height="2.4" rx="1.2" fill="#7a72ae" opacity="0.6"/>
  {hl(32, 16.5, 10, 1.2, 0.35)}
  <path d="M10 40 h44 l4 8 a3 3 0 0 1 -3 4 h-46 a3 3 0 0 1 -3 -4 z" fill="url(#mtlD)"/>
  <rect x="26" y="42" width="12" height="3" rx="1.5" fill="#3d3763"/>
""")

icons["plant"] = svg(shadow() + f"""
  <path d="M32 34 v-12" stroke="#2f8f5c" stroke-width="3" stroke-linecap="round"/>
  <path d="M32 28 c-10 0 -14 -6 -13 -12 c8 -1 13 4 13 12 z" fill="url(#grn)"/>
  <path d="M32 24 c9 -1 12 -7 11 -13 c-7 0 -11 5 -11 13 z" fill="url(#grnD)"/>
  <path d="M20 36 h24 l-3 20 a4 4 0 0 1 -4 3.4 h-10 a4 4 0 0 1 -4 -3.4 z" fill="url(#pur)"/>
  <rect x="17.5" y="32" width="29" height="7" rx="3" fill="url(#mtl)"/>
  {hl(27, 42, 3.5, 6, 0.35, 8)}
""")

icons["trophy"] = svg(shadow() + f"""
  <path d="M20 10 h24 v14 a12 12 0 0 1 -24 0 z" fill="url(#mtl)"/>
  <path d="M20 13 h-7 a8 8 0 0 0 8 10" fill="none" stroke="url(#mtlD)" stroke-width="3"/>
  <path d="M44 13 h7 a8 8 0 0 1 -8 10" fill="none" stroke="url(#mtlD)" stroke-width="3"/>
  <rect x="29" y="35" width="6" height="8" fill="url(#mtlD)"/>
  <rect x="21" y="43" width="22" height="6" rx="2" fill="url(#pur)"/>
  <rect x="18" y="49" width="28" height="6" rx="2.5" fill="url(#purD)"/>
  <text x="32" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="13" fill="#4d4676">1</text>
  {hl(27, 16, 4, 2, 0.55)}
""")

icons["cash"] = svg(shadow() + f"""
  <rect x="16" y="8" width="36" height="22" rx="3" fill="url(#grnD)" transform="rotate(4 34 19)"/>
  <rect x="11" y="16" width="42" height="26" rx="3.5" fill="url(#grn)"/>
  <rect x="11" y="16" width="42" height="26" rx="3.5" fill="none" stroke="#1e7a4c" stroke-width="1.2" opacity="0.6"/>
  <circle cx="32" cy="29" r="8.5" fill="url(#grnD)"/>
  <text x="32" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold" font-size="12" fill="#eafff3">$</text>
  <circle cx="17.5" cy="21.5" r="1.8" fill="#eafff3" opacity="0.85"/>
  <circle cx="46.5" cy="36.5" r="1.8" fill="#eafff3" opacity="0.85"/>
  {hl(28, 19.5, 9, 1.8, 0.4)}
""")

icons["gamepad"] = svg(shadow() + f"""
  <path d="M18 20 h28 a12 12 0 0 1 12 12 v6 a10 10 0 0 1 -18 6 l-2 -3 h-12 l-2 3 a10 10 0 0 1 -18 -6 v-6 a12 12 0 0 1 12 -12 z" fill="url(#pur)" transform="translate(-1 -2)"/>
  <rect x="14" y="26" width="4" height="12" rx="1.8" fill="#e9e5fb"/>
  <rect x="10" y="30" width="12" height="4" rx="1.8" fill="#e9e5fb"/>
  <circle cx="46" cy="28.5" r="2.6" fill="#9df3c0"/>
  <circle cx="52" cy="34" r="2.6" fill="#f3b8e3"/>
  {hl(24, 21, 8, 2, 0.4, -6)}
""")

icons["globe"] = svg(shadow() + f"""
  <circle cx="32" cy="30" r="19" fill="url(#grn)"/>
  <circle cx="32" cy="30" r="19" fill="none" stroke="#1e7a4c" stroke-width="1.2" opacity="0.5"/>
  <ellipse cx="32" cy="30" rx="9" ry="19" fill="none" stroke="#eafff3" stroke-width="1.6" opacity="0.75"/>
  <ellipse cx="32" cy="30" rx="19" ry="8" fill="none" stroke="#eafff3" stroke-width="1.6" opacity="0.75"/>
  <path d="M14 24 h36 M14 36 h36" stroke="#eafff3" stroke-width="1.6" opacity="0.55"/>
  {hl(24, 19, 6, 3.2, 0.5, -24)}
""")

icons["docs"] = svg(shadow(34, 59, 14, 3) + f"""
  <rect x="14" y="10" width="30" height="38" rx="3.5" fill="url(#purD)" transform="rotate(-6 29 29)"/>
  <rect x="20" y="14" width="30" height="40" rx="3.5" fill="url(#mtl)"/>
  <rect x="25" y="22" width="20" height="2.6" rx="1.3" fill="#6c639c"/>
  <rect x="25" y="28" width="20" height="2.6" rx="1.3" fill="#6c639c" opacity="0.85"/>
  <rect x="25" y="34" width="14" height="2.6" rx="1.3" fill="#6c639c" opacity="0.7"/>
  <circle cx="43" cy="44" r="7" fill="url(#grn)"/>
  <path d="M40 44 l2.2 2.4 l4 -4.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  {hl(30, 17.5, 9, 1.8, 0.45)}
""")

icons["phone"] = svg(shadow(30, 59, 12, 3) + f"""
  <rect x="18" y="7" width="28" height="46" rx="6" fill="url(#mtl)"/>
  <rect x="21.5" y="12" width="21" height="34" rx="2.5" fill="url(#navy)"/>
  <rect x="24" y="15" width="10" height="2" rx="1" fill="#a99ee6" opacity="0.9"/>
  <rect x="24" y="20" width="16" height="2" rx="1" fill="#7a72ae" opacity="0.8"/>
  <circle cx="32" cy="50" r="2.2" fill="#57507e"/>
  {hl(28, 9.5, 6, 1.2, 0.5)}
""")

icons["users"] = svg(shadow() + f"""
  <circle cx="42" cy="20" r="8" fill="url(#purD)"/>
  <path d="M28 46 a14 12 0 0 1 28 0 z" fill="url(#purD)"/>
  <circle cx="25" cy="24" r="9.5" fill="url(#mtl)"/>
  <path d="M8 52 a17 15 0 0 1 34 0 z" fill="url(#mtl)"/>
  {hl(21, 19, 3.5, 2, 0.55)}
""")

for name, content in icons.items():
    with open(os.path.join(OUT, f"{name}.svg"), "w", encoding="utf-8") as f:
        f.write(content)
    print(name, len(content))
