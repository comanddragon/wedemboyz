"use client";

/**
 * The page's single signature element: a dress shirt rendered as one
 * continuous fine hairline, drawn in on load like a tailor's chalk outline,
 * with the collar fold and pressed centre-crease as the only accents in
 * brass. Faint concentric press-lines breathe slowly behind it. This is the
 * one place the design spends its "boldness" — everything else stays quiet.
 */
export function GarmentMark({ className = "" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 480 560"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Illustration of a pressed dress shirt"
        >
            <defs>
                <radialGradient id="garment-glow" cx="50%" cy="38%" r="60%">
                    <stop offset="0%" stopColor="#b6893f" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#b6893f" stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* Self-contained keyframes so the mark animates on every mount,
          with no client state or effect required. */}
            <style>
                {`
          @keyframes at-draw-line {
            from { stroke-dashoffset: 1; }
            to   { stroke-dashoffset: 0; }
          }
          @keyframes at-fade-in {
            from { opacity: 0; }
            to   { opacity: var(--at-target-opacity, 1); }
          }
          .at-garment-path {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            animation: at-draw-line 2.2s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards;
          }
          .at-garment-accent {
            opacity: 0;
            animation: at-fade-in 0.8s ease forwards;
          }
          @media (prefers-reduced-motion: reduce) {
            .at-garment-path {
              animation: none;
              stroke-dashoffset: 0;
            }
            .at-garment-accent {
              animation: none;
              opacity: var(--at-target-opacity, 1);
            }
          }
        `}
            </style>

            <circle cx="240" cy="230" r="220" fill="url(#garment-glow)" />

            {[150, 190, 230].map((r, i) => (
                <circle
                    key={r}
                    cx="240"
                    cy="230"
                    r={r}
                    stroke="rgba(28,26,22,0.09)"
                    strokeWidth="1"
                    className="at-drift"
                    style={{ animationDelay: `${i * 0.8}s`, animationDuration: `${8 + i * 2}s` }}
                />
            ))}

            {/* shirt outline — one continuous stroke, drawn from start to finish */}
            <path
                d="M170 96 L170 70 Q170 50 190 46 L206 42 Q240 66 274 42 L290 46 Q310 50 310 70 L310 96
           L370 128 Q392 140 392 166 L392 210 L354 226 L354 500 Q354 512 342 512 L138 512 Q126 512 126 500 L126 226 L88 210 L88 166 Q88 140 110 128 L170 96 Z"
                stroke="#1c1a16"
                strokeOpacity="0.9"
                strokeWidth="2.25"
                strokeLinejoin="round"
                pathLength={1}
                className="at-garment-path"
                style={{animationDelay: "0.9s"} }

            />

            {/* collar fold accent — settles once the outline has finished drawing */}
            <path
                d="M206 42 Q240 66 274 42 L240 96 Z"
                stroke="#8a611f"
                strokeWidth="1.8"
                strokeLinejoin="round"
                className="at-garment-accent"
                style={{ ["--at-target-opacity" as string]: 1, animationDelay: "2.8s" }}
            />

            {/* pressed centre crease */}
            <line
                x1="240"
                y1="100"
                x2="240"
                y2="500"
                stroke="#8a611f"
                strokeWidth="1.4"
                strokeDasharray="2 6"
                className="at-garment-accent"
                style={{ ["--at-target-opacity" as string]: 0.55, animationDelay: "3.0s" }}
            />

            {/* buttons */}
            {[150, 210, 270, 330, 390, 450].map((y, i) => (
                <circle
                    key={y}
                    cx="240"
                    cy={y}
                    r="3"
                    fill="#8a611f"
                    className="at-garment-accent"
                    style={{ ["--at-target-opacity" as string]: 0.8, animationDelay: `${2 + i * 0.08}s` }}
                />
            ))}
        </svg>
    );
}