// src/components/Spinner.jsx
import React from "react";
import "../design/base.css";

export default function Spinner() {
  return (
    <div className="spinner" style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100px"
    }}>
      <picture>
        <source srcSet="/logo.webp" type="image/webp" />
        <img
          src="/logo.png"
          alt="Loading..."
          width="60"
          height="60"
          loading="lazy"
          decoding="async"
          style={{
            animation: "spin 1.2s linear infinite",
            borderRadius: "8px",
          }}
        />
      </picture>
    </div>
  );
}

