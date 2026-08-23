"use client";

import { useState } from "react";

/* eslint-disable @next/next/no-img-element */

interface Item {
  category: "packaging" | "identity" | "digital";
  img: string;
  tag: string;
  tagColor: string;
  title: string;
}

const ITEMS: Item[] = [
  { category: "packaging", img: "https://i.ibb.co/BHZ0YL65/IMG-0069.jpg", tag: "استاند بوب اب", tagColor: "#ec205f", title: "استاندات بوب اب فاخره" },
  { category: "identity", img: "https://i.ibb.co/whDKGPLk/Chat-GPT-Image-28-2025-02-25-40.png", tag: "هوية بصرية", tagColor: "#244da0", title: "مجموعة الأعمال الشاملة" },
  { category: "digital", img: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", tag: "مطبوعات ديجيتال", tagColor: "#ec205f", title: "بوسترات المعارض" },
];

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "packaging", label: "استاندات" },
  { value: "identity", label: "هويات تجارية" },
  { value: "digital", label: "مطبوعات ديجيتال" },
];

export function NajdPortfolio() {
  const [filter, setFilter] = useState("all");

  return (
    <section className="najd-portfolio">
      <div className="najd-container">
        <div className="najd-portfolio-head">
          <div className="text-right">
            <h2 className="najd-portfolio-title-top">إبداعاتنا</h2>
            <h3 className="najd-portfolio-title-main">معرض <span>الأعمال</span></h3>
          </div>

          <div className="najd-portfolio-filters">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={`najd-filter-btn${filter === f.value ? " active" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="najd-portfolio-grid">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className={`najd-portfolio-item${filter === "all" || filter === item.category ? "" : " hidden"}`}
              data-category={item.category}
            >
              <img src={item.img} alt={item.title} />
              <div className="najd-portfolio-overlay">
                <span style={{ color: item.tagColor }}>{item.tag}</span>
                <h4>{item.title}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
