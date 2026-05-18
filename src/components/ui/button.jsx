import React from "react";

export function Button({ className = "", variant = "default", ...props }) {
  const base =
    "inline-flex items-center justify-center font-bold transition active:scale-95 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
    destructive: "bg-rose-500 text-white hover:bg-rose-600",
  };

  return (
    <button
      className={`${base} ${variants[variant] || variants.default} ${className}`}
      {...props}
    />
  );
}
