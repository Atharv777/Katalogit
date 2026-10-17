export type ProductKind = "bag" | "headphones" | "vase" | "lamp";

export default function ProductArt({
  kind = "bag",
  color = "#ef7755",
  className = "",
}: {
  kind?: ProductKind;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="200" cy="337" rx="95" ry="17" fill="#292b40" opacity=".09" />
      {kind === "bag" && (
        <g transform="rotate(-8 200 220)">
          <path
            d="M154 156v-40c0-66 93-66 93 0v40"
            stroke={color}
            strokeWidth="18"
          />
          <path
            d="M154 155v-40c0-61 93-61 93 0v40"
            stroke="white"
            strokeOpacity=".2"
            strokeWidth="3"
          />
          <path
            d="M107 145h183l22 172c-66 23-137 23-222 0l17-172Z"
            fill={color}
          />
          <path d="m290 145 22 172-32 8-10-180" fill="black" opacity=".09" />
          <path
            d="M118 157h158l13 149c-55 16-111 17-184 0l13-149Z"
            stroke="white"
            strokeOpacity=".4"
            strokeDasharray="3 4"
          />
          <rect x="177" y="215" width="44" height="30" rx="3" fill="#fff5de" />
          <path
            d="M189 224v13m1-6 11-7m-11 7 11 6"
            stroke={color}
            strokeWidth="2"
          />
          <circle cx="151" cy="159" r="5" fill="#eccc8f" />
          <circle cx="247" cy="159" r="5" fill="#eccc8f" />
        </g>
      )}
      {kind === "headphones" && (
        <g transform="rotate(12 200 210)">
          <path
            d="M108 240v-83a92 92 0 0 1 184 0v83"
            stroke={color}
            strokeWidth="27"
          />
          <path
            d="M108 170v-13a92 92 0 0 1 184 0v13"
            stroke="white"
            strokeOpacity=".28"
            strokeWidth="5"
          />
          <rect x="80" y="193" width="62" height="113" rx="27" fill={color} />
          <rect x="258" y="193" width="62" height="113" rx="27" fill={color} />
          <rect x="125" y="206" width="28" height="88" rx="14" fill="#353643" />
          <rect x="246" y="206" width="28" height="88" rx="14" fill="#353643" />
          <path
            d="M92 220v55m215-55v55"
            stroke="white"
            strokeOpacity=".25"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      )}
      {kind === "vase" && (
        <g>
          <path
            d="M178 121h47l-3 48c3 29 64 49 64 104 0 80-172 80-172 0 0-55 61-75 64-104l-0-48Z"
            fill={color}
          />
          <ellipse cx="201" cy="122" rx="24" ry="8" fill="#505143" />
          <path
            d="M172 199c-42 68-36 100-11 122m32-145c-17 69-15 116-8 151m27-150c22 77 21 119 11 150m7-129c45 56 44 101 10 124"
            stroke="white"
            strokeOpacity=".25"
            strokeWidth="5"
          />
          <path
            d="M201 120c-9-39 28-62 44-88M204 91c-5-26-38-44-49-44"
            stroke="#738d5e"
            strokeWidth="4"
          />
          <ellipse
            cx="234"
            cy="56"
            rx="27"
            ry="10"
            transform="rotate(-41 234 56)"
            fill="#8fa47a"
          />
          <ellipse
            cx="172"
            cy="64"
            rx="26"
            ry="10"
            transform="rotate(35 172 64)"
            fill="#a5b28e"
          />
        </g>
      )}
      {kind === "lamp" && (
        <g>
          <path d="M195 193h14v126h-14z" fill="#afacb4" />
          <ellipse cx="201" cy="321" rx="71" ry="12" fill={color} />
          <path d="M97 192c0-151 208-151 208 0H97Z" fill={color} />
          <ellipse cx="201" cy="192" rx="104" ry="16" fill="#fff3cc" />
          <path
            d="M123 156c4-38 33-65 60-71"
            stroke="white"
            strokeOpacity=".35"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path d="M249 203v51" stroke="#8c8790" strokeWidth="2" />
          <circle cx="249" cy="256" r="5" fill="#c6b09a" />
        </g>
      )}
    </svg>
  );
}
