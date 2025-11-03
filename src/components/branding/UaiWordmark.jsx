"use client";

export default function UaiWordmark({ className = "", variant = "default" }) {
  const variantClass = variant ? ` uai-wordmark--${variant}` : "";
  const composedClassName = `uai-wordmark${variantClass}${className ? ` ${className}` : ""}`;

  return (
    <span className={composedClassName}>
      <span className="uai-wordmark__title">UAI</span>
      <span className="uai-wordmark__subtitle">minhas finanças.</span>
      <span className="uai-wordmark__tagline">
        <span className="uai-wordmark__tagline-word">Use.</span>{" "}
        <span className="uai-wordmark__tagline-word">Aprenda.</span>{" "}
        <span className="uai-wordmark__tagline-word">Invista.</span>
      </span>
    </span>
  );
}
