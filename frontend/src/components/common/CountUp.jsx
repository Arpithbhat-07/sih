import React, { useEffect, useRef, useState } from 'react';

// Lightweight count-up animation for KPI numbers.
export const CountUp = ({ value, duration = 900, decimals = 0, prefix = '', suffix = '', className }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef();

  useEffect(() => {
    let start;
    const from = 0;
    const to = Number(value) || 0;
    const step = (ts) => {
      if (start === undefined) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [value, duration]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString('en-IN');

  return <span className={className}>{prefix}{formatted}{suffix}</span>;
};
