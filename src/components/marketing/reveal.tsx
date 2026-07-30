"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delayClassName?: string;
};

/**
 * Scroll reveal wrapper — toggles classes via DOM when entering viewport.
 */
export function Reveal({ children, className, delayClassName }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const show = () => {
      node.classList.remove("opacity-0");
      node.classList.add("er-reveal");
      if (delayClassName) {
        node.classList.add(delayClassName);
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      show();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          show();
          observer.disconnect();
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delayClassName]);

  return (
    <div ref={ref} className={cn("opacity-0", className)}>
      {children}
    </div>
  );
}
