import React from "react";

export default function Logo({ size = 100 }: { size?: number }) {
  // Choose appropriate image size based on display size
  const getImageSrc = () => {
    if (size <= 100) return '/logo-100.webp';
    if (size <= 200) return '/logo-200.webp';
    return '/logo.webp';
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
      }}
    >
      <picture>
        <source 
          srcSet={getImageSrc()} 
          type="image/webp" 
        />
        <img
          src="/logo.png"
          alt="ATS Logo"
          width={size}
          height={size}
          loading="eager"
          fetchPriority="high"
          decoding="sync"
          style={{ 
            borderRadius: 8, 
            objectFit: "contain",
            width: size,
            height: size,
            display: "block",
          }}
        />
      </picture>
    </div>
  );
}
