"use client";

import { useEffect, useRef } from "react";

/**
 * Animated hero scene: a vector plane flying through the sky with a rider on
 * its back holding a bag full of money — bills flutter out of the bag as it
 * flies. The plane gently bobs, the propeller spins, clouds drift, and the
 * whole scene parallaxes with the pointer.
 */

const BILLS = [
  { dx: "-70px", rot: "-460deg", dur: "3.4s", delay: "0.2s", left: "52%", scale: 1 },
  { dx: "-30px", rot: "380deg", dur: "4.1s", delay: "1.1s", left: "56%", scale: 0.9 },
  { dx: "10px", rot: "-320deg", dur: "3.7s", delay: "1.9s", left: "54%", scale: 1.05 },
  { dx: "55px", rot: "430deg", dur: "4.4s", delay: "0.7s", left: "58%", scale: 0.85 },
  { dx: "90px", rot: "-390deg", dur: "3.9s", delay: "2.4s", left: "60%", scale: 1 },
  { dx: "-95px", rot: "350deg", dur: "4.6s", delay: "3s", left: "50%", scale: 0.8 },
  { dx: "30px", rot: "-410deg", dur: "4.2s", delay: "3.6s", left: "57%", scale: 0.95 },
];

function Bill({ dx, rot, dur, delay, left, scale }: (typeof BILLS)[number]) {
  return (
    <g
      className="mp-bill"
      style={
        {
          "--dx": dx,
          "--rot": rot,
          animationDuration: dur,
          animationDelay: delay,
          left,
          transform: `scale(${scale})`,
        } as React.CSSProperties
      }
    >
      <g className="mp-bill-flutter">
        <rect x="-16" y="-9" width="32" height="18" rx="2.5" fill="#7ddf9f" stroke="#1e7a4c" strokeWidth="1.4" />
        <rect x="-11.5" y="-5.5" width="23" height="11" rx="1.5" fill="none" stroke="#1e7a4c" strokeWidth="0.8" opacity="0.65" />
        <circle cx="0" cy="0" r="4.6" fill="#eafff3" />
        <text x="0" y="2.6" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="7" fill="#1e7a4c">
          $
        </text>
      </g>
    </g>
  );
}

export default function MoneyPlane() {
  const rootRef = useRef<HTMLDivElement>(null);
  const planeWrapRef = useRef<SVGGElement>(null);
  const cloudsRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        planeWrapRef.current?.style.setProperty("transform", `translate(${x * 12}px, ${y * 7}px)`);
        cloudsRef.current?.style.setProperty("transform", `translate(${x * -16}px, ${y * -8}px)`);
      });
    };
    root.addEventListener("pointermove", onMove);
    return () => {
      root.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="mp-root relative mx-auto aspect-square w-full max-w-[560px]" aria-hidden="true">
      {/* CSS 3D spinning coins */}
      <div className="coin3d left-[2%] top-[12%] h-12 w-12" style={{ animationDuration: "5s, 5s" }}>
        <div className="coin-face coin-front">$</div>
        <div className="coin-face coin-back">★</div>
      </div>
      <div className="coin3d right-[4%] top-[6%] h-9 w-9" style={{ animationDuration: "4s, 4s", animationDelay: "1s, 1s" }}>
        <div className="coin-face coin-front">$</div>
        <div className="coin-face coin-back">★</div>
      </div>
      <div className="coin3d bottom-[10%] left-[8%] h-8 w-8" style={{ animationDuration: "6s, 6s", animationDelay: "0.5s, 0.5s" }}>
        <div className="coin-face coin-front">$</div>
        <div className="coin-face coin-back">★</div>
      </div>

      <svg viewBox="0 0 640 640" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="mp-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0eefb" />
            <stop offset="0.5" stopColor="#b7b0dc" />
            <stop offset="1" stopColor="#6f66a3" />
          </linearGradient>
          <linearGradient id="mp-wing" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9c94c6" />
            <stop offset="1" stopColor="#514a7c" />
          </linearGradient>
          <linearGradient id="mp-bag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d9c48f" />
            <stop offset="1" stopColor="#a8823f" />
          </linearGradient>
          <filter id="mp-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* drifting clouds (parallax layer) */}
        <g ref={cloudsRef} className="mp-clouds">
          <g className="mp-cloud" style={{ animationDuration: "9s" }}>
            <ellipse cx="105" cy="180" rx="64" ry="24" fill="#ffffff" opacity="0.14" />
            <ellipse cx="150" cy="166" rx="44" ry="18" fill="#ffffff" opacity="0.1" />
          </g>
          <g className="mp-cloud" style={{ animationDuration: "12s", animationDelay: "1.5s" }}>
            <ellipse cx="545" cy="140" rx="70" ry="26" fill="#ffffff" opacity="0.13" />
            <ellipse cx="500" cy="126" rx="46" ry="18" fill="#ffffff" opacity="0.1" />
          </g>
          <g className="mp-cloud" style={{ animationDuration: "10s", animationDelay: "3s" }}>
            <ellipse cx="490" cy="520" rx="78" ry="28" fill="#ffffff" opacity="0.12" />
            <ellipse cx="430" cy="506" rx="50" ry="20" fill="#ffffff" opacity="0.09" />
          </g>
          <g className="mp-cloud" style={{ animationDuration: "11s", animationDelay: "4.5s" }}>
            <ellipse cx="140" cy="540" rx="66" ry="24" fill="#ffffff" opacity="0.12" />
          </g>
        </g>

        {/* twinkling sparkles */}
        <g fill="#fff">
          <circle className="mp-twinkle" cx="80" cy="90" r="2.4" style={{ animationDelay: "0s" }} />
          <circle className="mp-twinkle" cx="600" cy="240" r="2" style={{ animationDelay: "0.8s" }} />
          <circle className="mp-twinkle" cx="70" cy="420" r="2" style={{ animationDelay: "1.6s" }} />
          <circle className="mp-twinkle" cx="590" cy="470" r="2.6" style={{ animationDelay: "2.2s" }} />
          <circle className="mp-twinkle" cx="320" cy="60" r="2" style={{ animationDelay: "1.2s" }} />
          <circle className="mp-twinkle" cx="200" cy="580" r="2" style={{ animationDelay: "2.8s" }} />
        </g>

        {/* speed lines behind the plane */}
        <g stroke="#c9c2ec" strokeWidth="4" strokeLinecap="round" opacity="0.5">
          <line className="mp-speed" x1="80" y1="286" x2="150" y2="286" style={{ animationDelay: "0s" }} />
          <line className="mp-speed" x1="60" y1="316" x2="140" y2="316" style={{ animationDelay: "0.25s" }} />
          <line className="mp-speed" x1="90" y1="346" x2="160" y2="346" style={{ animationDelay: "0.5s" }} />
        </g>

        {/* plane + rider + bag (parallax wrapper → bob animation) */}
        <g ref={planeWrapRef}>
          <g className="mp-plane">
            {/* contrail puffs from the tail */}
            <g fill="#cfc8ef">
              <circle className="mp-puff" cx="118" cy="322" r="9" style={{ animationDelay: "0s" }} />
              <circle className="mp-puff" cx="92" cy="318" r="7" style={{ animationDelay: "0.5s" }} />
              <circle className="mp-puff" cx="68" cy="325" r="5" style={{ animationDelay: "1s" }} />
            </g>

            {/* tail fin + rear stabilizer */}
            <path d="M172 280 L142 206 L196 222 L212 272 Z" fill="url(#mp-body)" />
            <path d="M150 296 L118 292 L124 308 L156 310 Z" fill="url(#mp-wing)" />

            {/* fuselage */}
            <path d="M162 292 Q164 262 226 258 L418 262 Q492 268 512 312 Q494 352 424 358 L226 362 Q166 358 162 326 Z" fill="url(#mp-body)" />
            {/* belly shade */}
            <path d="M162 326 Q166 358 226 362 L424 358 Q494 352 512 312 Q500 338 448 346 L220 352 Q176 348 162 326 Z" fill="#4d4678" opacity="0.55" />
            {/* cockpit window */}
            <path d="M446 272 Q478 274 490 300 Q478 312 452 312 Q436 296 446 272 Z" fill="#8fd8e8" stroke="#4d4678" strokeWidth="3" />
            {/* cabin windows */}
            <circle cx="300" cy="292" r="8" fill="#8fd8e8" stroke="#4d4678" strokeWidth="2.4" />
            <circle cx="340" cy="292" r="8" fill="#8fd8e8" stroke="#4d4678" strokeWidth="2.4" />
            <circle cx="380" cy="292" r="8" fill="#8fd8e8" stroke="#4d4678" strokeWidth="2.4" />
            {/* wing */}
            <path d="M298 344 L408 344 L366 402 L272 398 Z" fill="url(#mp-wing)" />
            <path d="M272 398 L366 402 L358 414 L276 410 Z" fill="#3b3560" />
            {/* highlight on the body */}
            <path d="M226 268 L420 270 Q460 274 480 290 Q440 280 400 280 L230 282 Z" fill="#ffffff" opacity="0.35" />

            {/* propeller */}
            <circle cx="522" cy="310" r="12" fill="url(#mp-wing)" />
            <g className="mp-prop">
              <ellipse cx="524" cy="310" rx="5" ry="52" fill="#e8e5f8" opacity="0.85" />
            </g>
            <circle cx="522" cy="310" r="4.5" fill="#f0eefb" />

            {/* rider sitting on the fuselage (side view: butt on the top edge, thighs forward, calves hanging down over the side) */}
            <g>
              {/* seat shadow so the rider reads as planted on the hull */}
              <ellipse cx="298" cy="258" rx="26" ry="6" fill="#4d4678" opacity="0.45" />
              {/* back leg (thigh forward → calf hanging down) */}
              <path d="M288 248 Q306 252 318 258 Q326 274 324 294" fill="none" stroke="#3a4068" strokeWidth="10" strokeLinecap="round" />
              <ellipse cx="325" cy="298" rx="8.5" ry="4.8" fill="#e8e5f8" transform="rotate(12 325 298)" />
              {/* front leg */}
              <path d="M294 246 Q314 250 330 254 Q340 272 338 292" fill="none" stroke="#2c3052" strokeWidth="10" strokeLinecap="round" />
              <ellipse cx="339" cy="296" rx="8.5" ry="4.8" fill="#f4f2ff" transform="rotate(12 339 296)" />
              {/* torso leaning slightly back as he rides */}
              <path d="M286 250 Q280 216 300 208 Q322 204 326 230 L324 252 Q306 260 286 250 Z" fill="#6ee7b7" />
              <path d="M286 250 Q280 216 300 208 L302 252 Z" fill="#34d399" opacity="0.5" />
              {/* arm raised holding the bag rope */}
              <path d="M318 222 Q338 216 350 204" fill="none" stroke="#34d399" strokeWidth="9" strokeLinecap="round" />
              <circle cx="352" cy="202" r="6" fill="#f2c99b" />
              {/* scarf fluttering in the wind */}
              <path className="mp-scarf" d="M292 224 Q262 220 244 232 Q264 234 280 230 Q254 236 238 248 Q264 248 284 238 Z" fill="#f472b6" />
              {/* head */}
              <circle cx="308" cy="192" r="15" fill="#f2c99b" />
              <path d="M295 185 Q297 175 308 175 Q321 175 321 186 Q313 180 302 182 Q296 184 295 188 Z" fill="#2c3052" />
              <circle cx="302" cy="192" r="2.1" fill="#2c3052" />
              <circle cx="315" cy="192" r="2.1" fill="#2c3052" />
              <path d="M302 199.5 Q308 205 315 199.5" fill="none" stroke="#2c3052" strokeWidth="2" strokeLinecap="round" />
              {/* aviator cap */}
              <path d="M292 185 Q294 171 308 171 Q323 171 323 186 L319 184 Q310 176 298 182 Z" fill="#7c5cd6" />
              <path d="M323 190 Q331 192 329 200" fill="none" stroke="#7c5cd6" strokeWidth="4" strokeLinecap="round" />
            </g>

            {/* money bag hanging beside the rider */}
            <g className="mp-bag">
              {/* rope from hand to bag */}
              <path d="M352 202 L384 192" stroke="#d9c48f" strokeWidth="3.4" strokeLinecap="round" />
              {/* bills poking out of the mouth */}
              <rect x="372" y="168" width="30" height="14" rx="2" fill="#7ddf9f" stroke="#1e7a4c" strokeWidth="1.4" transform="rotate(-14 387 175)" />
              <rect x="380" y="172" width="30" height="14" rx="2" fill="#8fe8ae" stroke="#1e7a4c" strokeWidth="1.4" transform="rotate(6 395 179)" />
              {/* sack */}
              <path d="M384 186 Q370 190 362 210 Q354 232 366 248 Q380 262 400 258 Q420 254 424 232 Q428 210 412 192 Q400 182 384 186 Z" fill="url(#mp-bag)" />
              {/* tied neck */}
              <path d="M380 190 Q392 198 408 190" fill="none" stroke="#7a5f2c" strokeWidth="4" strokeLinecap="round" />
              {/* $ emblem */}
              <circle cx="392" cy="226" r="14" fill="#fff8e6" opacity="0.95" />
              <text x="392" y="233" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="18" fill="#a8823f">
                $
              </text>
              {/* stitching + highlight */}
              <path d="M366 214 Q360 232 370 248" fill="none" stroke="#7a5f2c" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.7" />
              <ellipse cx="376" cy="204" rx="7" ry="3.4" fill="#fff" opacity="0.35" transform="rotate(-18 376 204)" />
            </g>

            {/* bills raining out of the bag */}
            <g transform="translate(392 196)">
              {BILLS.map((b, i) => (
                <Bill key={i} {...b} />
              ))}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
