"use client";

import { useEffect, useState } from "react";
import { PORTFOLIO_DEFAULTS, type PortfolioContent } from "@/lib/portfolio";

/* eslint-disable @next/next/no-img-element */

export function NajdPortfolio() {
  const [filter, setFilter] = useState("all");
  // Start from the shipped defaults so the section renders instantly, then swap
  // in the merchant's saved gallery once it loads — no empty flash.
  const [content, setContent] = useState<PortfolioContent>(PORTFOLIO_DEFAULTS);

  useEffect(() => {
    let alive = true;
    fetch("/api/homepage/portfolio")
      .then((r) => r.json())
      .then((res) => {
        if (alive && res?.success && res.data) setContent(res.data);
      })
      .catch(() => {/* keep defaults */});
    return () => {
      alive = false;
    };
  }, []);

  if (!content.enabled) return null;

  const { titleTop, titleMain, titleHighlight, filters, items } = content;

  return (
    <section className="najd-portfolio">
      <div className="najd-container">
        <div className="najd-portfolio-head">
          <div className="text-right">
            <h2 className="najd-portfolio-title-top">{titleTop}</h2>
            <h3 className="najd-portfolio-title-main">
              {titleMain} <span>{titleHighlight}</span>
            </h3>
          </div>

          <div className="najd-portfolio-filters">
            {filters.map((f) => (
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
          {items.map((item) => (
            <div
              key={item.id}
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
