import { useEffect, useRef } from "react";
import "spoilerjs/spoiler-span";

interface SpoilerSpanProps {
  children: React.ReactNode;
  className?: string;
  pointerEvents?: "auto" | "none";
}

const SpoilerSpan = ({ children, className = "", pointerEvents = "auto" }: SpoilerSpanProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const el = document.createElement("spoiler-span") as HTMLElement;
    if (className) el.className = className;
    if (pointerEvents === "none") el.style.pointerEvents = "none";

    const text = typeof children === "string" ? children : "";
    el.textContent = text;

    node.appendChild(el);

    return () => {
      if (node && el.parentNode === node) {
        node.removeChild(el);
      }
    };
  }, [className, pointerEvents, children]);

  return <div ref={containerRef} />;
};

export default SpoilerSpan;
