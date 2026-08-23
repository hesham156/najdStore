import { ProductCard } from "@/components/store/ProductCard";
import { NajdPortfolio } from "@/components/store/NajdPortfolio";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/store/AnimatedSection";
import type { ProductWithCategory } from "@/types";

const ROOT_ID = "najd-landing-block";
const WHATSAPP_URL = "https://wa.me/966573999056";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');

  #${ROOT_ID},
  #${ROOT_ID} *,
  #${ROOT_ID} *::before,
  #${ROOT_ID} *::after { box-sizing: border-box; }

  #${ROOT_ID} .najd-small-quantities { padding: 96px 0; background: #080c14; position: relative; overflow: hidden; }
  #${ROOT_ID} .najd-small-blur-1, #${ROOT_ID} .najd-small-blur-2 { position: absolute; border-radius: 9999px; pointer-events: none; }
  #${ROOT_ID} .najd-small-blur-1 { top: -40px; left: 40px; width: 80px; height: 80px; background: rgba(236, 32, 95, 0.2); filter: blur(32px); }
  #${ROOT_ID} .najd-small-blur-2 { bottom: 40px; right: 40px; width: 160px; height: 160px; background: rgba(36, 77, 160, 0.10); filter: blur(48px); }
  #${ROOT_ID} .najd-small-header { text-align: center; margin-bottom: 80px; }
  #${ROOT_ID} .najd-small-label { color: #ec205f; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: .3em; margin-bottom: 16px; }
  #${ROOT_ID} .najd-small-title { font-size: 40px; line-height: 1.2; font-weight: 900; color: #fff; margin: 0; }
  #${ROOT_ID} .najd-small-title span { color: #244da0; }
  #${ROOT_ID} .najd-small-desc { color: #6b7280; margin: 24px auto 0; max-width: 42rem; line-height: 1.9; font-size: 16px; }
  #${ROOT_ID} .najd-small-grid { display: grid; grid-template-columns: 1fr; gap: 32px; }
  #${ROOT_ID} .najd-small-card { padding: 40px; border-radius: 40px; border: 1px solid rgba(255,255,255,0.05); position: relative; overflow: hidden; transition: all .35s ease; }
  #${ROOT_ID} .najd-small-card:hover { transform: translateY(-6px); }
  #${ROOT_ID} .najd-small-orb { position: absolute; top: -40px; left: -40px; width: 128px; height: 128px; border-radius: 9999px; transition: transform .7s ease; }
  #${ROOT_ID} .najd-small-card:hover .najd-small-orb { transform: scale(1.5); }
  #${ROOT_ID} .najd-small-icon { font-size: 48px; margin-bottom: 32px; position: relative; z-index: 1; }
  #${ROOT_ID} .najd-small-card h4 { font-size: 22px; font-weight: 800; color: #fff; margin: 0 0 16px; position: relative; z-index: 1; }
  #${ROOT_ID} .najd-small-card p { color: #9ca3af; font-size: 14px; line-height: 1.9; margin: 0 0 24px; position: relative; z-index: 1; }
  #${ROOT_ID} .najd-startup-badge { display: inline-block; padding: 6px 12px; border-radius: 10px; font-size: 10px; font-weight: 700; border: 1px solid rgba(255,255,255,0.15); position: relative; z-index: 1; }
  #${ROOT_ID} .najd-small-highlight { margin-top: 64px; padding: 32px; border-radius: 32px; border: 1px solid rgba(255,255,255,0.05); background: linear-gradient(to left, rgba(36,77,160,.2), rgba(236,32,95,.2), transparent); display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 24px; text-align: center; }
  #${ROOT_ID} .najd-small-highlight-wrap { display: flex; align-items: center; gap: 24px; text-align: right; }
  #${ROOT_ID} .najd-small-highlight-icon { width: 64px; height: 64px; min-width: 64px; background: rgba(255,255,255,0.10); border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 32px; }
  #${ROOT_ID} .najd-small-highlight h4 { margin: 0 0 8px; font-size: 20px; font-weight: 700; }
  #${ROOT_ID} .najd-small-highlight p { margin: 0; color: #9ca3af; font-size: 12px; }
  #${ROOT_ID} .najd-small-highlight-btn { padding: 16px 40px; background: #ec205f; color: #fff; border-radius: 18px; font-weight: 900; box-shadow: 0 20px 40px rgba(236,32,95,.2); transition: transform .3s ease; }
  #${ROOT_ID} .najd-small-highlight-btn:hover { transform: scale(1.05); }

  #${ROOT_ID} { font-family: 'Tajawal', sans-serif; direction: rtl; color: #fff; position: relative; z-index: 2; }
  #${ROOT_ID} a, #${ROOT_ID} button { text-decoration: none; }
  #${ROOT_ID} button { font-family: inherit; cursor: pointer; }
  #${ROOT_ID} .najd-container { max-width: 1280px; margin: 0 auto; padding: 0 16px; position: relative; z-index: 2; }
  #${ROOT_ID} .najd-glass { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.10); }
  #${ROOT_ID} .najd-gradient-text { background: linear-gradient(135deg, #244da0 0%, #ec205f 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  #${ROOT_ID} .najd-btn-primary { background: linear-gradient(135deg, #244da0 0%, #ec205f 100%)!important; color: #fff !important; border:0 !important; }
  #${ROOT_ID} .najd-section-title { font-size: 40px; line-height: 1.2; font-weight: 800; margin: 0 0 24px; }
  #${ROOT_ID} .najd-section-title span { color: #244da0; }
  #${ROOT_ID} .najd-section-label { font-size: 14px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; margin-bottom: 12px; }
  #${ROOT_ID} .najd-section-desc { color: #9ca3af; font-size: 18px; line-height: 1.9; margin: 0; }
  #${ROOT_ID} .najd-divider { width: 96px; height: 6px; margin: 0 auto 32px; border-radius: 999px; background: linear-gradient(135deg, #244da0 0%, #ec205f 100%); }
  #${ROOT_ID} .najd-hero { position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 80px 0 40px; overflow: hidden; background: radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%), url('https://images.unsplash.com/photo-1626785774573-4b799315345d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80'); background-size: cover; background-position: center; }
  #${ROOT_ID} .najd-hero-blur-1, #${ROOT_ID} .najd-hero-blur-2 { position: absolute; width: 24rem; height: 24rem; border-radius: 9999px; filter: blur(120px); animation: najdPulse 4s infinite ease-in-out; pointer-events: none; }
  #${ROOT_ID} .najd-hero-blur-1 { top: 33%; right: -6rem; background: rgba(36, 77, 160, 0.3); }
  #${ROOT_ID} .najd-hero-blur-2 { bottom: 25%; left: -6rem; background: rgba(236, 32, 95, 0.2); animation-delay: 2s; }
  #${ROOT_ID} .najd-hero-wrap { display: flex; flex-direction: column; align-items: center; gap: 4rem; padding: 3rem 0; }
  #${ROOT_ID} .najd-hero-content, #${ROOT_ID} .najd-hero-visual { width: 100%; }
  #${ROOT_ID} .najd-hero-content { text-align: center; }
  #${ROOT_ID} .najd-hero-badge { display: inline-block; padding: 0.375rem 1rem; border-radius: 9999px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ec205f; font-size: 0.875rem; font-weight: 700; letter-spacing: 0.04em; }
  #${ROOT_ID} .najd-hero-title { font-size: 3rem; line-height: 1.15; font-weight: 800; margin: 24px 0 0; }
  #${ROOT_ID} .najd-hero-desc { font-size: 1.125rem; color: #9ca3af; max-width: 42rem; margin: 24px auto 0; line-height: 1.8; font-weight: 300; }
  #${ROOT_ID} .najd-hero-buttons { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; margin-top: 32px; }
  #${ROOT_ID} .najd-hero-btn { width: 100%; max-width: 260px; padding: 1rem 2.5rem; border-radius: 0.75rem; font-weight: 700; font-size: 1.125rem; transition: all 0.3s ease; display: inline-flex; align-items: center; justify-content: center; gap: 0.75rem; border: 1px solid transparent; color: #fff; }
  #${ROOT_ID} .najd-hero-btn:hover, #${ROOT_ID} .najd-cta-btn:hover, #${ROOT_ID} .najd-consult-btn:hover, #${ROOT_ID} .najd-large-cta:hover { transform: translateY(-2px); }
  #${ROOT_ID} .najd-hero-btn.secondary { border: 1px solid rgba(255,255,255,0.1); }
  #${ROOT_ID} .najd-hero-features { display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; padding-top: 2rem; }
  #${ROOT_ID} .najd-hero-feature { display: flex; align-items: center; gap: 0.5rem; }
  #${ROOT_ID} .najd-hero-feature span:last-child { font-size: 0.875rem; color: #d1d5db; }
  #${ROOT_ID} .najd-hero-visual { position: relative; }
  #${ROOT_ID} .najd-visual-grid { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; transform: rotate(-3deg); transition: all 0.7s ease; }
  #${ROOT_ID} .najd-visual-grid:hover { transform: rotate(0deg); }
  #${ROOT_ID} .najd-box-card { aspect-ratio: 1 / 1; border-radius: 1rem; box-shadow: 0 25px 50px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); position: relative; overflow: hidden; }
  #${ROOT_ID} .najd-box-card .overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.2); opacity: 0; transition: opacity 0.3s ease; }
  #${ROOT_ID} .najd-box-card:hover .overlay { opacity: 1; }
  #${ROOT_ID} .najd-box-blue { background-image: url(https://cdn.salla.sa/EZORvA/972ac16c-8599-4203-96c1-39d995cb9b62-500x500-31Qm8zuDg10SEabdsT10wNsPukwGqWQzkoFqwgeW.jpg); background-size: contain; }
  #${ROOT_ID} .najd-box-pink { background-image: url(https://cdn.salla.sa/EZORvA/04431389-c6c1-4675-a658-dbac51d4b558-333.06962025316x500-cPqGIfrcMJKGapfMlJbpglUk6SWjHRXQSYGQFpn9.png); background-size: cover; background-repeat: no-repeat; margin-top: 2rem; }
  #${ROOT_ID} .najd-box-label { color: #fff; font-weight: 900; font-size: 1.25rem; letter-spacing: 0.15em; opacity: 0.4; }
  #${ROOT_ID} .najd-box-white { background: #fff; grid-column: span 2; height: 10rem; border-radius: 1rem; box-shadow: 0 25px 50px rgba(0,0,0,0.35); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; }
  #${ROOT_ID} .najd-box-white::before { content: ""; position: absolute; inset: 0; opacity: 0.1; background-image: radial-gradient(#000 1px, transparent 1px); background-size: 10px 10px; }
  #${ROOT_ID} .najd-white-bars { display: flex; gap: 1rem; position: relative; z-index: 1; }
  #${ROOT_ID} .najd-white-bars div { width: 3rem; height: 0.5rem; border-radius: 9999px; }
  #${ROOT_ID} .najd-white-title { color: #111827; font-weight: 900; font-size: 1.5rem; letter-spacing: 0.3em; margin-top: 0.5rem; position: relative; z-index: 1; }
  #${ROOT_ID} .najd-visual-frame { position: absolute; inset: 0; border: 2px solid rgba(236, 32, 95, 0.2); border-radius: 1rem; transform: translate(1rem, 1rem); z-index: 1; }
  #${ROOT_ID} .najd-services, #${ROOT_ID} .najd-why-us, #${ROOT_ID} .najd-digital-print { background: #0a0f1d; padding: 96px 0; position: relative; overflow: hidden; }
  #${ROOT_ID} .najd-services-top-line { position: absolute; top: 0; right: 0; width: 100%; height: 1px; background: linear-gradient(to left, transparent, rgba(236,32,95,.3), transparent); }
  #${ROOT_ID} .najd-section-header { text-align: center; margin-bottom: 80px; }
  #${ROOT_ID} .najd-services .najd-section-label { color: #ec205f; }
  #${ROOT_ID} .najd-services-grid { display: grid; grid-template-columns: 1fr; gap: 32px; }
  #${ROOT_ID} .najd-service-card { padding: 32px; border-radius: 24px; transition: all .3s ease; }
  #${ROOT_ID} .najd-service-card:hover { transform: translateY(-8px); }
  #${ROOT_ID} .najd-service-icon { width: 64px; height: 64px; border-radius: 18px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
  #${ROOT_ID} .najd-service-card h3 { font-size: 22px; font-weight: 700; margin: 0 0 12px; transition: color .3s ease; }
  #${ROOT_ID} .najd-service-card p { color: #9ca3af; font-size: 14px; line-height: 1.9; margin: 0; }
  #${ROOT_ID} .najd-service-card.box-1:hover h3, #${ROOT_ID} .najd-service-card.box-4:hover h3 { color: #ec205f; }
  #${ROOT_ID} .najd-service-card.box-2:hover h3 { color: #244da0; }
  #${ROOT_ID} .najd-service-card.box-3:hover h3 { color: #fff; }
  #${ROOT_ID} .najd-cta-box { margin-top: 80px; padding: 40px; border-radius: 24px; text-align: center; position: relative; overflow: hidden; }
  #${ROOT_ID} .najd-cta-box::before { content: ""; position: absolute; top: 0; left: 0; width: 2px; height: 100%; background: #ec205f; }
  #${ROOT_ID} .najd-cta-box h4 { font-size: 30px; font-weight: 700; margin: 0 0 16px; }
  #${ROOT_ID} .najd-cta-box p { color: #9ca3af; margin: 0 auto 32px; max-width: 640px; line-height: 1.9; }
  #${ROOT_ID} .najd-cta-btn, #${ROOT_ID} .najd-consult-btn, #${ROOT_ID} .najd-large-cta { display: inline-block; padding: 14px 40px; border: 2px solid #ec205f; color: #ec205f; border-radius: 12px; font-weight: 700; transition: all .3s ease; background: transparent; }
  #${ROOT_ID} .najd-portfolio { padding: 96px 0; background: #0f172a; position: relative; }
  #${ROOT_ID} .najd-portfolio-head { display: flex; flex-direction: column; gap: 24px; justify-content: space-between; margin-bottom: 48px; }
  #${ROOT_ID} .najd-portfolio-title-top { color: #ec205f; font-weight: 700; font-size: 14px; margin-bottom: 8px; }
  #${ROOT_ID} .najd-portfolio-title-main { font-size: 40px; font-weight: 800; line-height: 1.2; margin: 0; }
  #${ROOT_ID} .najd-portfolio-title-main span { color: #244da0; }
  #${ROOT_ID} .najd-portfolio-filters { display: flex; flex-wrap: wrap; gap: 12px; }
  #${ROOT_ID} .najd-filter-btn { padding: 10px 24px; border-radius: 9999px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all .3s ease; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: #d1d5db; }
  #${ROOT_ID} .najd-filter-btn.active { background: #ec205f; color: #fff; border-color: #ec205f; box-shadow: 0 10px 30px rgba(236,32,95,.2); }
  #${ROOT_ID} .najd-portfolio-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
  #${ROOT_ID} .najd-portfolio-item { position: relative; overflow: hidden; border-radius: 24px; aspect-ratio: 4 / 3; background: #1f2937; border: 1px solid rgba(255,255,255,0.1); animation: najdFadeIn .5s ease forwards; }
  #${ROOT_ID} .najd-portfolio-item img { width: 100%; height: 100%; object-fit: cover; opacity: .7; transition: transform .4s ease; display: block; }
  #${ROOT_ID} .najd-portfolio-item:hover img { transform: scale(1.1); }
  #${ROOT_ID} .najd-portfolio-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #0f172a, rgba(15,23,42,.4), transparent); opacity: 0; transition: opacity .3s ease; display: flex; flex-direction: column; justify-content: flex-end; padding: 32px; }
  #${ROOT_ID} .najd-portfolio-item:hover .najd-portfolio-overlay { opacity: 1; }
  #${ROOT_ID} .najd-portfolio-overlay span { font-weight: 700; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; }
  #${ROOT_ID} .najd-portfolio-overlay h4 { font-size: 22px; font-weight: 700; margin: 0; color: #fff; }
  #${ROOT_ID} .najd-portfolio-item.hidden { display: none !important; }
  #${ROOT_ID} .najd-why-wrap, #${ROOT_ID} .najd-digital-wrap { display: flex; flex-direction: column; gap: 64px; align-items: center; }
  #${ROOT_ID} .najd-why-content, #${ROOT_ID} .najd-why-visual, #${ROOT_ID} .najd-digital-content, #${ROOT_ID} .najd-digital-visual { width: 100%; }
  #${ROOT_ID} .najd-why-head { text-align: right; margin-bottom: 32px; }
  #${ROOT_ID} .najd-why-label { color: #244da0; }
  #${ROOT_ID} .najd-why-title, #${ROOT_ID} .najd-digital-title, #${ROOT_ID} .najd-large-title { font-size: 40px; font-weight: 800; line-height: 1.2; margin: 0 0 24px; }
  #${ROOT_ID} .najd-why-title span { color: #ec205f; }
  #${ROOT_ID} .najd-digital-title span, #${ROOT_ID} .najd-large-title span { color: #244da0; }
  #${ROOT_ID} .najd-features-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
  #${ROOT_ID} .najd-feature-box { padding: 24px; border-radius: 20px; transition: all .3s ease; }
  #${ROOT_ID} .najd-feature-box:hover { border-color: #ec205f; background: rgba(236, 32, 95, 0.05); transform: translateY(-4px); }
  #${ROOT_ID} .najd-feature-icon { margin-bottom: 16px; line-height: 0; }
  #${ROOT_ID} .najd-feature-box h4 { font-size: 20px; font-weight: 700; margin: 0 0 8px; }
  #${ROOT_ID} .najd-feature-box p { font-size: 14px; line-height: 1.9; color: #6b7280; margin: 0; }
  #${ROOT_ID} .najd-partners-card { padding: 40px; border-radius: 48px; position: relative; overflow: hidden; }
  #${ROOT_ID} .najd-partners-glow { position: absolute; top: -24px; right: -24px; width: 96px; height: 96px; border-radius: 9999px; filter: blur(24px); opacity: .5; background: linear-gradient(135deg, #244da0 0%, #ec205f 100%); pointer-events: none; }
  #${ROOT_ID} .najd-partners-title { font-size: 28px; font-weight: 700; text-align: center; margin: 0 0 40px; position: relative; z-index: 1; }
  #${ROOT_ID} .najd-partners-title span { color: #244da0; }
  #${ROOT_ID} .najd-partners-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; opacity: .4; filter: grayscale(100%); transition: all .3s ease; position: relative; z-index: 1; }
  #${ROOT_ID} .najd-partners-card:hover .najd-partners-grid { opacity: .75; filter: grayscale(0%); }
  #${ROOT_ID} .najd-partner-item { height: 48px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; font-style: italic; letter-spacing: -.03em; }
  #${ROOT_ID} .najd-testimonial-box { margin-top: 48px; padding: 24px; background: rgba(255,255,255,0.05); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); position: relative; z-index: 1; }
  #${ROOT_ID} .najd-testimonial-wrap { display: flex; align-items: center; gap: 16px; }
  #${ROOT_ID} .najd-quote-badge { width: 48px; height: 48px; min-width: 48px; border-radius: 9999px; background: #ec205f; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; box-shadow: 0 10px 24px rgba(236,32,95,.35); }
  #${ROOT_ID} .najd-testimonial-text { font-size: 12px; line-height: 1.9; color: #9ca3af; font-style: italic; margin: 0; }
  #${ROOT_ID} .najd-testimonial-author { font-size: 10px; font-weight: 700; margin-top: 8px; color: #244da0; }
  #${ROOT_ID} .najd-digital-print { background: #0f172a; }
  #${ROOT_ID} .najd-digital-content { text-align: center; }
  #${ROOT_ID} .najd-digital-desc { font-size: 1.125rem; color: #9ca3af; font-weight: 300; line-height: 1.9; margin: 0; }
  #${ROOT_ID} .najd-digital-image-wrap { position: relative; }
  #${ROOT_ID} .najd-digital-image-card { padding: 16px; border-radius: 48px; box-shadow: 0 25px 50px rgba(0,0,0,0.35); }
  #${ROOT_ID} .najd-digital-image-card img { width: 100%; display: block; border-radius: 40px; filter: grayscale(100%); transition: all .7s ease; }
  #${ROOT_ID} .najd-digital-image-card:hover img { filter: grayscale(0%); }
  #${ROOT_ID} .najd-fast-badge { position: absolute; top: -40px; right: -40px; background: #ec205f; padding: 32px; border-radius: 9999px; box-shadow: 0 25px 50px rgba(0,0,0,0.35); display: none; }
  #${ROOT_ID} .najd-fast-badge span { color: #fff; font-weight: 900; font-size: 20px; }
  #${ROOT_ID} .najd-digital-points { display: grid; grid-template-columns: 1fr; gap: 16px; }
  #${ROOT_ID} .najd-digital-point { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.05); padding: 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); transition: border-color .3s ease; text-align: right; }
  #${ROOT_ID} .najd-digital-point.blue:hover { border-color: #244da0; }
  #${ROOT_ID} .najd-digital-point.pink:hover { border-color: #ec205f; }
  #${ROOT_ID} .najd-digital-iconbox { width: 48px; height: 48px; min-width: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
  #${ROOT_ID} .najd-digital-point span:last-child { font-weight: 700; font-size: 14px; }
  #${ROOT_ID} .najd-large-format { padding: 96px 0; background: #0a0c14; position: relative; overflow: hidden; }
  #${ROOT_ID} .najd-large-bg-shape { position: absolute; top: 0; right: 0; width: 50%; height: 100%; background: rgba(236, 32, 95, 0.05); transform: skewX(12deg) translateX(8rem); pointer-events: none; }
  #${ROOT_ID} .najd-large-header { text-align: center; margin-bottom: 80px; }
  #${ROOT_ID} .najd-large-label { color: #244da0; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 0.3em; margin-bottom: 16px; }
  #${ROOT_ID} .najd-large-divider { width: 128px; height: 6px; background: linear-gradient(135deg, #244da0 0%, #ec205f 100%); margin: 24px auto 0; border-radius: 999px; }
  #${ROOT_ID} .najd-large-grid { display: grid; grid-template-columns: 1fr; gap: 40px; }
  #${ROOT_ID} .najd-io-card { position: relative; border-radius: 48px; overflow: hidden; min-height: 500px; border: 1px solid rgba(255,255,255,0.1); }
  #${ROOT_ID} .najd-io-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
  #${ROOT_ID} .najd-io-card:hover .najd-io-img { transform: scale(1.08); }
  #${ROOT_ID} .najd-io-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #0b0f1a, rgba(11,15,26,.6), transparent); transition: all .5s ease; }
  #${ROOT_ID} .najd-io-body { position: relative; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; padding: 40px; gap: 16px; }
  #${ROOT_ID} .najd-io-tag { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .18em; width: fit-content; color: #fff; }
  #${ROOT_ID} .najd-io-title { font-size: 32px; font-weight: 900; color: #fff; margin: 0; }
  #${ROOT_ID} .najd-io-desc { color: #d1d5db; font-size: 14px; line-height: 1.9; max-width: 32rem; margin: 0; }
  #${ROOT_ID} .najd-io-list { display: flex; flex-wrap: wrap; gap: 12px; padding: 0; margin: 0; list-style: none; }
  #${ROOT_ID} .najd-io-list li { padding: 8px 16px; background: rgba(255,255,255,0.05); border-radius: 12px; font-size: 12px; border: 1px solid rgba(255,255,255,0.1); }
  #${ROOT_ID} .najd-large-cta-box { margin-top: 64px; padding: 40px; border-radius: 40px; border: 1px solid rgba(36,77,160,0.2); display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 32px; text-align: center; }
  #${ROOT_ID} .najd-large-cta-box h4 { font-size: 28px; font-weight: 700; color: #fff; margin: 0 0 8px; }
  #${ROOT_ID} .najd-large-cta-box p { color: #9ca3af; font-size: 14px; margin: 0; }
  #${ROOT_ID} .najd-large-cta.najd-btn-primary { border: none; color: #fff; }

  #${ROOT_ID} .najd-stickers { position: relative; padding: 96px 0; background: #05070a; overflow: hidden; }
  #${ROOT_ID} .najd-stickers-marquee { position: absolute; top: 0; left: 0; right: 0; font-size: 64px; font-weight: 900; white-space: nowrap; opacity: 0.05; color: #fff; letter-spacing: 0.18em; pointer-events: none; transform: translateY(-18px); text-align: center; }
  #${ROOT_ID} .najd-stickers-head { display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; margin-bottom: 64px; gap: 32px; }
  #${ROOT_ID} .najd-stickers-head-content { width: 100%; text-align: right; margin-right: auto; }
  #${ROOT_ID} .najd-stickers-label { color: #ec205f; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: .5em; margin-bottom: 12px; }
  #${ROOT_ID} .najd-stickers-title { font-size: 40px; font-weight: 900; line-height: 1.2; color: #fff; margin: 0; }
  #${ROOT_ID} .najd-stickers-desc { color: #6b7280; margin-top: 16px; max-width: 34rem; line-height: 1.9; font-size: 14px; font-weight: 500; }
  #${ROOT_ID} .najd-stickers-grid { display: grid; grid-template-columns: 1fr; gap: 24px; direction: ltr; }
  #${ROOT_ID} .najd-sticker-card { position: relative; transition: transform .35s ease; direction: rtl; }
  #${ROOT_ID} .najd-peel { position: absolute; top: 0; right: 0; width: 58px; height: 58px; z-index: 3; pointer-events: none; overflow: hidden; border-top-right-radius: 28px; }
  #${ROOT_ID} .najd-sticker-body { padding: 32px; border-radius: 32px; height: 100%; min-height: 300px; position: relative; overflow: hidden; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); transition: transform .35s ease, border-color .35s ease, box-shadow .35s ease, background .35s ease; }
  #${ROOT_ID} .najd-sticker-card:hover .najd-sticker-body { transform: translateY(-10px); border-color: rgba(236, 32, 95, 0.35); box-shadow: 0 24px 40px rgba(0,0,0,.28); background: rgba(255,255,255,0.04); }
  #${ROOT_ID} .najd-sticker-body::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(236,32,95,.10), transparent 30%); opacity: 0; transition: opacity .35s ease; pointer-events: none; }
  #${ROOT_ID} .najd-sticker-card:hover .najd-sticker-body::after { opacity: 1; }
  #${ROOT_ID} .najd-sticker-icon { font-size: 40px; margin-bottom: 24px; position: relative; z-index: 1; transition: transform .35s ease; }
  #${ROOT_ID} .najd-sticker-card:hover .najd-sticker-icon { transform: scale(1.08) rotate(-4deg); }
  #${ROOT_ID} .najd-sticker-title { font-size: 22px; font-weight: 900; color: #fff; margin: 0 0 10px; position: relative; z-index: 1; }
  #${ROOT_ID} .najd-sticker-sub { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: .18em; margin-bottom: 16px; position: relative; z-index: 1; }
  #${ROOT_ID} .najd-sticker-text { color: #dbdbdb; font-size: 12px; line-height: 1.9; margin: 0 0 20px; position: relative; z-index: 1; }
  #${ROOT_ID} .najd-sticker-tags { display: flex; flex-wrap: wrap; gap: 8px; position: relative; z-index: 1; margin-top: auto; }
  #${ROOT_ID} .najd-sticker-tag { padding: 10px 12px; background: rgba(255,255,255,0.05); border-radius: 10px; font-size: 14px; font-weight: 700; border: 1px solid rgba(255,255,255,0.1); text-transform: uppercase; color: #d1d5db; transition: all .3s ease; }
  #${ROOT_ID} .najd-sticker-card:hover .najd-sticker-tag { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); color: #fff; }
  @media (min-width: 640px) { #${ROOT_ID} .najd-stickers-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (min-width: 1024px) {
    #${ROOT_ID} .najd-stickers-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    #${ROOT_ID} .najd-stickers-head-content { width: 100%; justify-content: center; display: flex; align-items: center; flex-direction: column; text-align: center; }
  }
  @media (max-width: 767px) {
    #${ROOT_ID} .najd-stickers { padding: 72px 0; }
    #${ROOT_ID} .najd-stickers-marquee { font-size: 34px; transform: translateY(-8px); }
    #${ROOT_ID} .najd-stickers-title { font-size: 32px; }
    #${ROOT_ID} .najd-sticker-body { padding: 24px; border-radius: 24px; min-height: 260px; }
    #${ROOT_ID} .najd-peel { width: 46px; height: 46px; border-top-right-radius: 24px; }
  }

  @keyframes najdPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
  @keyframes najdFadeIn { from { opacity: 0; transform: scale(.95); } to { opacity: 1; transform: scale(1); } }

  @media (min-width: 640px) {
    #${ROOT_ID} .najd-features-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    #${ROOT_ID} .najd-partners-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    #${ROOT_ID} .najd-digital-points { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (min-width: 768px) {
    #${ROOT_ID} .najd-small-grid { grid-template-columns: repeat(3, 1fr); }
    #${ROOT_ID} .najd-small-highlight { flex-direction: row; text-align: right; }
    #${ROOT_ID} .najd-services-grid { grid-template-columns: repeat(2, 1fr); }
    #${ROOT_ID} .najd-portfolio-head { flex-direction: row; align-items: flex-end; }
    #${ROOT_ID} .najd-portfolio-grid { grid-template-columns: repeat(2, 1fr); }
    #${ROOT_ID} .najd-large-cta-box { flex-direction: row; text-align: right; }
  }
  @media (min-width: 1024px) {
    #${ROOT_ID} .najd-hero-wrap, #${ROOT_ID} .najd-why-wrap, #${ROOT_ID} .najd-digital-wrap { flex-direction: row; }
    #${ROOT_ID} .najd-hero-content { width: 60%; text-align: right; }
    #${ROOT_ID} .najd-hero-desc { margin-right: 0; margin-left: 0; }
    #${ROOT_ID} .najd-hero-buttons { flex-direction: row; justify-content: flex-start; }
    #${ROOT_ID} .najd-hero-features { justify-content: flex-start; }
    #${ROOT_ID} .najd-hero-visual { width: 40%; }
    #${ROOT_ID} .najd-services-grid { grid-template-columns: repeat(4, 1fr); }
    #${ROOT_ID} .najd-portfolio-grid { grid-template-columns: repeat(3, 1fr); }
    #${ROOT_ID} .najd-why-content, #${ROOT_ID} .najd-why-visual, #${ROOT_ID} .najd-digital-content, #${ROOT_ID} .najd-digital-visual { width: 50%; }
    #${ROOT_ID} .najd-digital-content { text-align: right; }
    #${ROOT_ID} .najd-fast-badge { display: block; }
    #${ROOT_ID} .najd-large-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 767px) {
    #${ROOT_ID} .najd-small-title { font-size: 32px; }
    #${ROOT_ID} .najd-small-quantities { padding: 72px 0; }
    #${ROOT_ID} .najd-small-highlight-wrap { align-items: flex-start; }
    #${ROOT_ID} .najd-hero { min-height: auto; padding-top: 50px; padding-bottom: 50px; }
    #${ROOT_ID} .najd-hero-title, #${ROOT_ID} .najd-section-title, #${ROOT_ID} .najd-portfolio-title-main, #${ROOT_ID} .najd-why-title, #${ROOT_ID} .najd-digital-title, #${ROOT_ID} .najd-large-title { font-size: 32px; }
    #${ROOT_ID} .najd-services, #${ROOT_ID} .najd-portfolio, #${ROOT_ID} .najd-why-us, #${ROOT_ID} .najd-digital-print, #${ROOT_ID} .najd-large-format { padding: 72px 0; }
    #${ROOT_ID} .najd-cta-box h4, #${ROOT_ID} .najd-partners-title, #${ROOT_ID} .najd-large-cta-box h4 { font-size: 24px; }
    #${ROOT_ID} .najd-partners-card { padding: 28px; border-radius: 32px; }
    #${ROOT_ID} .najd-testimonial-wrap { align-items: flex-start; }
    #${ROOT_ID} .najd-digital-image-card { border-radius: 32px; }
    #${ROOT_ID} .najd-digital-image-card img { border-radius: 24px; }
    #${ROOT_ID} .najd-io-card { min-height: 420px; border-radius: 32px; }
    #${ROOT_ID} .najd-io-body { padding: 28px; }
    #${ROOT_ID} .najd-io-title { font-size: 28px; }
  }

  #${ROOT_ID} .najd-products-slider-section { padding: 96px 0; background: #0f172a; }
  #${ROOT_ID} .najd-slider-header { text-align: center; margin-bottom: 48px; }
  #${ROOT_ID} .najd-slider-header h2 { font-size: 36px; font-weight: 900; margin: 0 0 12px; background: linear-gradient(135deg, #244da0, #ec205f); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  #${ROOT_ID} .najd-slider-header p { color: #9ca3af; font-size: 14px; }
  #${ROOT_ID} .najd-slider-grid { display: grid; grid-template-columns: repeat(1, minmax(0, 1fr)); gap: 20px; }
  @media (min-width: 640px) { #${ROOT_ID} .najd-slider-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (min-width: 1024px) { #${ROOT_ID} .najd-slider-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
`;

const HERO_HTML = `
  <section class="najd-hero">
    <div class="najd-hero-blur-1"></div>
    <div class="najd-hero-blur-2"></div>
    <div class="najd-container">
      <div class="najd-hero-wrap">
        <div class="najd-hero-content">
          <div class="najd-hero-badge">متخصصون في التغليف والطباعة الفاخرة</div>
          <h1 class="najd-hero-title">نحول هويتك إلى <br><span class="najd-gradient-text">واقع ملموس</span></h1>
          <p class="najd-hero-desc">من الصناديق الفاخرة الملونة إلى المطبوعات التجارية الدقيقة، نقدم لك في نجد برنت حلولاً متكاملة تبرز قيمة علامتك التجارية بأعلى معايير الجودة العالمية.</p>
          <div class="najd-hero-buttons">
            <a href="${WHATSAPP_URL}" class="najd-hero-btn najd-btn-primary">ابدأ مشروعك
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </a>
            <a href="/all-print-products/c804817736" class="najd-hero-btn najd-glass secondary">تصفح أعمالنا</a>
          </div>
          <div class="najd-hero-features">
            <div class="najd-hero-feature"><span style="color:#ec205f;">●</span><span>طباعة رقمية</span></div>
            <div class="najd-hero-feature"><span style="color:#244da0;">●</span><span>تغليف فاخر</span></div>
            <div class="najd-hero-feature"><span style="color:#ffffff;">●</span><span>تصميم هويات</span></div>
          </div>
        </div>
        <div class="najd-hero-visual">
          <div class="najd-visual-grid">
            <div class="najd-box-card najd-box-blue"><div class="overlay"></div><span class="najd-box-label">NAJD</span></div>
            <div class="najd-box-card najd-box-pink"><div class="overlay"></div><span class="najd-box-label">NAJD</span></div>
            <div class="najd-box-white">
              <div class="najd-white-bars"><div style="background:#244da0;"></div><div style="background:#ec205f;"></div></div>
              <span class="najd-white-title">NAJD</span>
            </div>
          </div>
          <div class="najd-visual-frame"></div>
        </div>
      </div>
    </div>
  </section>
`;

const SERVICES_HTML = `
  <section class="najd-services">
    <div class="najd-services-top-line"></div>
    <div class="najd-container">
      <div class="najd-section-header">
        <h2 class="najd-section-label">ماذا نقدم؟</h2>
        <div class="najd-section-title">خدماتنا <span>المتميزة</span></div>
        <div class="najd-divider"></div>
        <p class="najd-section-desc">نحن في نجد برنت نؤمن بأن كل تفصيلة صغيرة تصنع فارقاً كبيراً، لذا نقدم خدماتنا بدقة متناهية وشغف بالإبداع.</p>
      </div>
      <div class="najd-services-grid">
        <div class="najd-service-card najd-glass box-1">
          <div class="najd-service-icon" style="color:#ec205f;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>
          <h3>الطباعة الاوفست</h3>
          <p>حلول طباعة احترافية للكميات الكبيرة بجودة ثابتة وألوان دقيقة، مثالية للبراندات اللي تبحث عن الفخامة والتكلفة المناسبة مع الحفاظ على أعلى مستوى من التفاصيل.</p>
        </div>
        <div class="najd-service-card najd-glass box-2">
          <div class="najd-service-icon" style="color:#244da0;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></div>
          <h3>الطباعة الديجيتال</h3>
          <p>طباعة سريعة ومرنة تناسب المشاريع العاجلة والكميات الصغيرة، بألوان حيوية وجودة عالية بدون تعقيد — الحل المثالي لإنجاز شغلك في وقت قياسي.</p>
        </div>
        <div class="najd-service-card najd-glass box-3">
          <div class="najd-service-icon" style="color:#ffffff;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg></div>
          <h3>الاندور</h3>
          <p>نصمم وننفذ جميع أعمال الطباعة الداخلية مثل اللوحات، الاستيكرات، والديكورات، بشكل يعزز هوية مشروعك داخل المكان ويعطي تجربة بصرية احترافية.</p>
        </div>
        <div class="najd-service-card najd-glass box-4">
          <div class="najd-service-icon" style="color:#ec205f;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
          <h3>الاوت دور</h3>
          <p>حلول طباعة خارجية قوية تتحمل العوامل الجوية، من البنرات واللوحات الإعلانية إلى تغليف السيارات، بجودة عالية تضمن وضوح رسالتك في كل مكان.</p>
        </div>
      </div>
      <div class="najd-cta-box najd-glass">
        <h4>هل لديك مشروع طباعة خاص؟</h4>
        <p>تحدث مع خبراء الطباعة لدينا اليوم للحصول على استشارة مجانية وعرض سعر مخصص لمشروعك القادم.</p>
        <a href="${WHATSAPP_URL}" class="najd-cta-btn najd-btn-primary">استشارة مجانية</a>
      </div>
    </div>
  </section>
`;

const STICKERS_HTML = `
  <section class="najd-stickers">
    <div class="najd-container">
      <div class="najd-stickers-head">
        <div class="najd-stickers-head-content">
          <h2 class="najd-stickers-label">Sticker Universe</h2>
          <h3 class="najd-stickers-title">عالم <span class="najd-gradient-text accent">الملصقات</span></h3>
          <p class="najd-stickers-desc">استيكرات نجد ليست مجرد ورق لاصق، إنها واجهة علامتك التجارية على كافة الأسطح. مقاومة، دقيقة، وبخيارات لا حصر لها.</p>
        </div>
      </div>
      <div class="najd-stickers-grid">
        <div class="najd-sticker-card">
          <div class="najd-sticker-body najd-glass">
            <div class="najd-sticker-icon">✨</div>
            <h4 class="najd-sticker-title">Glossy</h4>
            <p class="najd-sticker-sub" style="color:#ec205f;">الاستيكر اللامع</p>
            <p class="najd-sticker-text">يتميز بلمعان قوي يعزز من وضوح الألوان، مثالي للملصقات الدعائية.</p>
            <div class="najd-sticker-tags"><span class="najd-sticker-tag">High Shine</span></div>
          </div>
        </div>
        <div class="najd-sticker-card">
          <div class="najd-peel"></div>
          <div class="najd-sticker-body najd-glass" style="background:linear-gradient(to bottom right, rgba(255,255,255,.03), transparent);">
            <div class="najd-sticker-icon">🌑</div>
            <h4 class="najd-sticker-title">Matte</h4>
            <p class="najd-sticker-sub" style="color:#244da0;">الاستيكر المطفي</p>
            <p class="najd-sticker-text">لمسة مخملية فاخرة بدون انعكاسات ضوئية. يمنح شعارك طابعاً كلاسيكياً.</p>
            <div class="najd-sticker-tags"><span class="najd-sticker-tag">No Glare</span></div>
          </div>
        </div>
        <div class="najd-sticker-card">
          <div class="najd-peel"></div>
          <div class="najd-sticker-body najd-glass">
            <div class="najd-sticker-icon">🫥</div>
            <h4 class="najd-sticker-title">Transparent</h4>
            <p class="najd-sticker-sub" style="color:rgba(255,255,255,.5);">الاستيكر الشفاف</p>
            <p class="najd-sticker-text">يختفي تماماً ليظهر التصميم وكأنه مطبوع مباشرة على السطح.</p>
            <div class="najd-sticker-tags"><span class="najd-sticker-tag">Invisible</span></div>
          </div>
        </div>
        <div class="najd-sticker-card">
          <div class="najd-peel"></div>
          <div class="najd-sticker-body najd-glass" style="background:linear-gradient(to bottom left, rgba(236,32,95,.05), transparent);">
            <div class="najd-sticker-icon">🛡️</div>
            <h4 class="najd-sticker-title">Heavy Duty</h4>
            <p class="najd-sticker-sub" style="color:#f97316;">المقاوم للعوامل</p>
            <p class="najd-sticker-text">استيكرات فينيل جبارة مقاومة للماء، الشمس، والحرارة العالية.</p>
            <div class="najd-sticker-tags"><span class="najd-sticker-tag">Weatherproof</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>
`;

const SMALL_QUANTITIES_HTML = `
  <section class="najd-small-quantities">
    <div class="najd-small-blur-1"></div>
    <div class="najd-small-blur-2"></div>
    <div class="najd-container">
      <div class="najd-small-header">
        <h2 class="najd-small-label">مرونة بلا حدود</h2>
        <h3 class="najd-small-title">حلول نجد للمشاريع <span>الناشئة</span></h3>
        <p class="najd-small-desc">لا تحتاج لطلب الآلاف لتبدأ. نحن نوفر لك جودة المصانع الكبرى في كميات تبدأ من 50 حبة فقط لتجربة منتجك في السوق بكل سهولة.</p>
      </div>
      <div class="najd-small-grid">
        <div class="najd-small-card najd-glass">
          <div class="najd-small-orb" style="background:rgba(236,32,95,.10);"></div>
          <div class="najd-small-icon">📦</div>
          <h4>كميات مرنة</h4>
          <p>ابدأ بـ 50 أو 100 حبة من صناديق التغليف أو المطبوعات الورقية دون الحاجة لميزانيات ضخمة.</p>
          <span class="najd-startup-badge" style="background:rgba(236,32,95,.10); color:#ec205f; border-color:rgba(236,32,95,.20);">مثالي للمتاجر الجديدة</span>
        </div>
        <div class="najd-small-card najd-glass">
          <div class="najd-small-orb" style="background:rgba(36,77,160,.10);"></div>
          <div class="najd-small-icon">✨</div>
          <h4>جودة فاخرة</h4>
          <p>نستخدم تقنيات طباعة ديجيتال متطورة تعطي نتائج تضاهي طباعة الأوفست في دقة الألوان والتفاصيل.</p>
          <span class="najd-startup-badge" style="background:rgba(36,77,160,.10); color:#244da0; border-color:rgba(36,77,160,.20);">ألوان نابضة بالحياة</span>
        </div>
        <div class="najd-small-card najd-glass">
          <div class="najd-small-orb" style="background:rgba(255,255,255,.05);"></div>
          <div class="najd-small-icon">🚀</div>
          <h4>سرعة البرق</h4>
          <p>نحن نعلم أن وقتك من ذهب؛ لذا نسلم طلبات الكميات الصغيرة خلال 3 إلى 5 أيام عمل فقط.</p>
          <span class="najd-startup-badge" style="background:rgba(255,255,255,.10); color:#fff; border-color:rgba(255,255,255,.20);">توصيل سريع</span>
        </div>
      </div>
      <div class="najd-small-highlight">
        <div class="najd-small-highlight-wrap">
          <div class="najd-small-highlight-icon">💡</div>
          <div>
            <h4>هل أنت صاحب مشروع منزلي أو متجر إلكتروني؟</h4>
            <p>احصل على عينات تجريبية مجانية لمنتجك قبل البدء في الطلب الفعلي.</p>
          </div>
        </div>
        <a href="${WHATSAPP_URL}" class="najd-small-highlight-btn najd-btn-primary">تواصل مع مستشار المشاريع</a>
      </div>
    </div>
  </section>
`;

const WHY_HTML = `
  <section class="najd-why-us">
    <div class="najd-container">
      <div class="najd-why-wrap">
        <div class="najd-why-content">
          <div class="najd-why-head">
            <h2 class="najd-section-label najd-why-label">لماذا نحن؟</h2>
            <h3 class="najd-why-title">سر تميزنا في <span>نجد برنت</span></h3>
            <p class="najd-section-desc">نحن لا نقوم بمجرد الطباعة، بل نصنع تجربة بصرية متكاملة تعزز من قيمة علامتك التجارية في السوق وتجذب جمهورك المستهدف من النظرة الأولى.</p>
          </div>
          <div class="najd-features-grid">
            <div class="najd-feature-box najd-glass">
              <div class="najd-feature-icon" style="color:#ec205f;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
              <h4>ضمان الجودة</h4>
              <p>نستخدم أفضل أنواع الورق والأحبار العالمية لضمان نتائج مبهرة تدوم طويلاً.</p>
            </div>
            <div class="najd-feature-box najd-glass">
              <div class="najd-feature-icon" style="color:#244da0;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
              <h4>سرعة التنفيذ</h4>
              <p>نحترم مواعيدك بدقة، مع توفير خيارات الطباعة المستعجلة للتسليم في نفس اليوم.</p>
            </div>
            <div class="najd-feature-box najd-glass">
              <div class="najd-feature-icon" style="color:#ffffff;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM18 8a2 2 0 114 0v1a2 2 0 11-4 0V8zM11 13a2 2 0 114 0v1a2 2 0 11-4 0v-1zM18 17a2 2 0 114 0v1a2 2 0 11-4 0v-1zM5 8a2 2 0 114 0v1a2 2 0 11-4 0V8zM5 17a2 2 0 114 0v1a2 2 0 11-4 0v-1z"/></svg></div>
              <h4>أحدث التقنيات</h4>
              <p>نمتلك أسطولاً من ماكينات الطباعة الألمانية واليابانية الأكثر تطوراً في المنطقة.</p>
            </div>
            <div class="najd-feature-box najd-glass">
              <div class="najd-feature-icon" style="color:#ec205f;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg></div>
              <h4>أسعار تنافسية</h4>
              <p>نقدم موازنة مثالية بين أعلى مستويات الجودة وأفضل الأسعار المدروسة.</p>
            </div>
          </div>
        </div>
        <div class="najd-why-visual">
          <div class="najd-partners-card najd-glass">
            <div class="najd-partners-glow"></div>
            <h4 class="najd-partners-title">شركاء <span>النجاح</span></h4>
            <div class="najd-partners-grid">
              <div class="najd-partner-item">BRAND_A</div>
              <div class="najd-partner-item">BRAND_B</div>
              <div class="najd-partner-item">BRAND_C</div>
              <div class="najd-partner-item">BRAND_D</div>
              <div class="najd-partner-item">BRAND_E</div>
              <div class="najd-partner-item">BRAND_F</div>
            </div>
            <div class="najd-testimonial-box">
              <div class="najd-testimonial-wrap">
                <div class="najd-quote-badge">"</div>
                <div>
                  <p class="najd-testimonial-text">"نجد برنت حولت فكرة مشروعنا إلى حقيقة من خلال التغليف الاستثنائي الذي أبهر عملاءنا."</p>
                  <p class="najd-testimonial-author">مدير التسويق - شركة ريادة</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
`;

const DIGITAL_HTML = `
  <section class="najd-digital-print">
    <div class="najd-container">
      <div class="najd-digital-wrap">
        <div class="najd-digital-visual">
          <div class="najd-digital-image-wrap">
            <div class="najd-digital-image-card najd-glass"><img src="https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&w=800&q=80" alt="الطباعة الديجيتال"></div>
            <div class="najd-fast-badge"><span>FAST</span></div>
          </div>
        </div>
        <div class="najd-digital-content">
          <h2 class="najd-digital-title">الطباعة الديجيتال <br><span>بسرعة الضوء</span></h2>
          <p class="najd-digital-desc">نحن نستخدم أحدث ماكينات الطباعة الرقمية في العالم لضمان استلام طلبك في زمن قياسي وبأعلى دقة ألوان ممكنة. مثالية للكميات الصغيرة والمتوسطة والمشاريع العاجلة.</p>
          <div class="najd-digital-points" style="margin-top:32px;">
            <div class="najd-digital-point blue"><div class="najd-digital-iconbox" style="background:rgba(36,77,160,.2);">⚡</div><span>تسليم خلال 24 ساعة</span></div>
            <div class="najd-digital-point pink"><div class="najd-digital-iconbox" style="background:rgba(236,32,95,.2);">🎯</div><span>دقة ألوان 100%</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>
`;

const LARGE_HTML = `
  <section class="najd-large-format">
    <div class="najd-large-bg-shape"></div>
    <div class="najd-container">
      <div class="najd-large-header">
        <h2 class="najd-large-label">الطباعة العريضة والدعائية</h2>
        <h3 class="najd-large-title">حلول الـ <span style="color:#ec205f;">إندور والأوت دور</span></h3>
        <div class="najd-large-divider"></div>
      </div>
      <div class="najd-large-grid">
        <div class="najd-io-card">
          <img src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="طباعة داخلية" class="najd-io-img">
          <div class="najd-io-overlay"></div>
          <div class="najd-io-body">
            <div class="najd-io-tag" style="background:#244da0;">Indoor | داخلي</div>
            <h4 class="najd-io-title">دقة بصرية مذهلة</h4>
            <p class="najd-io-desc">نقدم طباعة الإندور عالية الدقة للبوسترات، الرول أب، وورق الجدران المخصص، مع ألوان حيوية تخطف الأنظار في المساحات القريبة.</p>
            <ul class="najd-io-list"><li>Roll Up</li><li>Pop Up</li><li>Vinyl Wall</li></ul>
          </div>
        </div>
        <div class="najd-io-card">
          <img src="https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" alt="طباعة خارجية" class="najd-io-img">
          <div class="najd-io-overlay"></div>
          <div class="najd-io-body">
            <div class="najd-io-tag" style="background:#ec205f;">Outdoor | خارجي</div>
            <h4 class="najd-io-title">متانة تقاوم العوامل</h4>
            <p class="najd-io-desc">طباعة الأوت دور مخصصة للوحات البنرات واليوني بول والملصقات الضخمة، مصممة لتحمل حرارة الشمس القوية والرياح والأمطار لضمان بقاء إعلانك مشرقاً.</p>
            <ul class="najd-io-list"><li>Flex Banner</li><li>Mesh</li><li>3D Signs</li></ul>
          </div>
        </div>
      </div>
      <div class="najd-large-cta-box najd-glass">
        <div>
          <h4>هل تحتاج للوحات إعلانية لمشروعك؟</h4>
          <p>نحن نوفر خدمات القياس، التصميم، والتركيب لجميع أنواع المطبوعات العريضة.</p>
        </div>
        <a href="${WHATSAPP_URL}" class="najd-large-cta najd-btn-primary">احصل على استشارة</a>
      </div>
    </div>
  </section>
`;

function ProductSlider({ title, subtitle, products }: { title: string; subtitle?: string; products: ProductWithCategory[] }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="najd-products-slider-section">
      <div className="najd-container">
        <div className="najd-slider-header">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <StaggerContainer className="najd-slider-grid">
          {products.slice(0, 8).map((p) => (
            <StaggerItem key={p.id}>
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

export function NajdLanding({ featured, recent }: { featured: ProductWithCategory[]; recent: ProductWithCategory[] }) {
  return (
    <div id={ROOT_ID}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <AnimatedSection direction="none">
        <div dangerouslySetInnerHTML={{ __html: HERO_HTML }} />
      </AnimatedSection>

      <AnimatedSection>
        <div dangerouslySetInnerHTML={{ __html: SERVICES_HTML }} />
      </AnimatedSection>

      <AnimatedSection>
        <ProductSlider title="أحدث منتجاتنا" subtitle="اكتشف أحدث أعمالنا في الطباعة والتغليف الفاخر" products={featured} />
      </AnimatedSection>

      <AnimatedSection>
        <div dangerouslySetInnerHTML={{ __html: STICKERS_HTML }} />
      </AnimatedSection>

      <AnimatedSection>
        <ProductSlider title="أحدث الملصقات" products={recent} />
      </AnimatedSection>

      <AnimatedSection>
        <div dangerouslySetInnerHTML={{ __html: SMALL_QUANTITIES_HTML }} />
      </AnimatedSection>

      <AnimatedSection>
        <NajdPortfolio />
      </AnimatedSection>

      <AnimatedSection>
        <div dangerouslySetInnerHTML={{ __html: WHY_HTML }} />
      </AnimatedSection>

      <AnimatedSection direction="right">
        <div dangerouslySetInnerHTML={{ __html: DIGITAL_HTML }} />
      </AnimatedSection>

      <AnimatedSection>
        <div dangerouslySetInnerHTML={{ __html: LARGE_HTML }} />
      </AnimatedSection>
    </div>
  );
}
