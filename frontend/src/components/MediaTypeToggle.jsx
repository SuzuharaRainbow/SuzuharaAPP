import React from "react";
import { useSearchParams } from "react-router-dom";

const options = [
  { value: "all", label: "全部" },
  { value: "image", label: "图片" },
  { value: "video", label: "视频" },
];

export default function MediaTypeToggle() {
  const [params, setParams] = useSearchParams();
  const active = params.get("type") || "all";

  const onSelect = (value) => {
    const next = new URLSearchParams(params);
    if (value === "all") {
      next.delete("type");
    } else {
      next.set("type", value);
    }
    next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="toggle-pill">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={active === opt.value ? "is-active" : undefined}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
