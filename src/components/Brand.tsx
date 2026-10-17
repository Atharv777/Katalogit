import { Box } from "lucide-react";

export default function Brand({
  onClick,
  inverse = false,
}: {
  onClick?: () => void;
  inverse?: boolean;
}) {
  return (
    <button
      className={`brand ${inverse ? "brand-inverse" : ""}`}
      onClick={onClick}
      aria-label="Katalogit AI home"
    >
      <span className="brand-icon">
        <Box size={23} strokeWidth={1.7} />
      </span>
      <span>
        katalogit<span className="brand-ai">ai</span>
      </span>
    </button>
  );
}
