"use client";

import { useState, type ReactNode } from "react";

export function ClientCounter({ children }: { children?: ReactNode }) {
  const [count, setCount] = useState(2);
  return (
    <div className="demo-card">
      <div className="counter-row">
        <div>
          <span className="eyebrow">CLIENT STATE</span>
          <strong>{count} items in your list</strong>
        </div>
        <button className="round-action" onClick={() => setCount((value) => value + 1)} aria-label="Add one item">
          +
        </button>
      </div>
      <div className="nested-boundary-slot">{children}</div>
    </div>
  );
}
