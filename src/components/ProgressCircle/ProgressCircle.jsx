import React from "react";

function ProgressCircle({ value, max, label, color = "#facc15" }) {
  const radius = 60;
  const stroke = 10;

  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div style={{ textAlign: "center" }}>
      <svg height={radius * 2} width={radius * 2}>

        <circle
          stroke="#222"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />

        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill="white"
          fontSize="18"
          fontWeight="bold"
        >
          {value}
        </text>

      </svg>

      <div style={{ marginTop: "8px", fontSize: "14px", color: "#aaa" }}>
        {label}
      </div>
    </div>
  );
}

export default ProgressCircle;