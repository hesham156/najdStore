"use client";

import Link from "next/link";
import { SiteLogo } from "@/components/ui/site-logo";
import { useBranding } from "@/components/providers/BrandingProvider";
import { useSession, signOut } from "next-auth/react";
import { useCartStore } from "@/store/cart";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ShoppingCart, LogOut, LayoutDashboard, Shield, Menu, X, ChevronDown, Bell, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CurrencySelector } from "@/components/store/CurrencySelector";
import { LanguageSwitcher } from "@/components/store/LanguageSwitcher";
import { useTranslations } from "next-intl";

const navLinks = [
  { href: "/",         key: "home" },
  { href: "/products", key: "products" },
  { href: "/blog",     key: "blog" },
  { href: "/faq",      key: "faq" },
  { href: "/contact",  key: "contact" },
] as const;

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

export function Navbar() {
  // Name, tagline and logo all come from the branding context the root layout
  // fills in — one source, rather than a prop for the name and a context for
  // the logo that could drift apart.
  const { siteName, tagline } = useBranding();
  const t = useTranslations();
  const { data: session } = useSession();
  const { getTotalItems, toggleCart, clearCart } = useCartStore();
  const [isMenuOpen, setIsMenuOpen]   = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();
  const totalItems = getTotalItems();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      className={cn(
        "sticky top-0 z-40 w-full transition-colors duration-300",
        scrolled
          ? "border-b border-line/50 bg-surface/95 shadow-md backdrop-blur-md"
          : "bg-surface border-b border-line"
      )}
      initial={{ y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: reduced ? 0.1 : 0.45, ease: EASE }}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={reduced ? {} : { scale: 1.08, rotate: -4 }}
              transition={{ duration: 0.2 }}
            >
              <SiteLogo size="sm" />
            </motion.div>
            <div className="hidden sm:block">
              <span className="block text-base font-bold leading-tight text-fg">{siteName}</span>
              {tagline && (
                <span className="block text-xs leading-tight text-primary-600 dark:text-primary-400">{tagline}</span>
              )}
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative whitespace-nowrap px-2.5 py-2 text-sm font-medium text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-surface-sunken transition-colors"
              >
                {t(`nav.${link.key}`)}
              </Link>
            ))}
          </div>

          {/* Search — the only entry point outside the products page's own
              filter panel, which shoppers never see until they get there. */}
          <form
            action="/products"
            method="get"
            role="search"
            className="hidden xl:flex items-center flex-1 min-w-[170px] max-w-xs mx-3"
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-fg-subtle" />
              <input
                type="search"
                name="search"
                placeholder={t("common.searchPlaceholder")}
                aria-label={t("common.search")}
                className="w-full rounded-xl border border-line bg-surface-sunken py-2 ps-9 pe-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <CurrencySelector />
            {/* Compact: one cycling button instead of three inline icons, which
                were crowding the header next to the currency, cart and account. */}
            <ThemeToggle compact className="hidden sm:flex" />

            {/* Cart */}
            <motion.button
              onClick={toggleCart}
              className="relative p-2.5 rounded-xl text-fg-muted hover:bg-surface-sunken transition-colors"
              whileTap={reduced ? {} : { scale: 0.9 }}
              aria-label={t("navbar.cart")}
            >
              <ShoppingCart className="h-5 w-5" />
              <AnimatePresence>
                {mounted && totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute -top-0.5 -start-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-primary-600 text-white text-xs font-bold"
                  >
                    {totalItems > 9 ? "9+" : totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* User Menu */}
            {session ? (
              <div className="relative">
                <motion.button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-sunken transition-colors"
                  whileTap={reduced ? {} : { scale: 0.97 }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold text-sm">
                    {session.user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-fg-muted max-w-[100px] truncate">
                    {session.user.name}
                  </span>
                  <motion.span
                    animate={{ rotate: isUserMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-fg-subtle" />
                  </motion.span>
                </motion.button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsUserMenuOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="absolute start-0 top-full mt-2 w-56 rounded-xl border border-line bg-surface shadow-xl z-20 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-line">
                          <p className="font-semibold text-fg text-sm">{session.user.name}</p>
                          <p className="text-xs text-fg-subtle mt-0.5">{session.user.email}</p>
                        </div>
                        <div className="py-1">
                          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg-muted hover:bg-surface-sunken" onClick={() => setIsUserMenuOpen(false)}>
                            <LayoutDashboard className="h-4 w-4" />{t("navbar.dashboard")}
                          </Link>
                          <Link href="/dashboard/notifications" className="flex items-center gap-3 px-4 py-2.5 text-sm text-fg-muted hover:bg-surface-sunken" onClick={() => setIsUserMenuOpen(false)}>
                            <Bell className="h-4 w-4" />{t("navbar.notifications")}
                          </Link>
                          {(session.user.role === "ADMIN" || session.user.role === "STAFF") && (
                            <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20" onClick={() => setIsUserMenuOpen(false)}>
                              <Shield className="h-4 w-4" />{t("navbar.adminPanel")}
                            </Link>
                          )}
                          <hr className="my-1 border-line" />
                          {/* The cart lives in localStorage under one shared
                              key, so without this the next person to sign in on
                              this browser inherits the previous user's basket. */}
                          <button onClick={() => { clearCart(); signOut({ callbackUrl: "/" }); }} className="flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 w-full">
                            <LogOut className="h-4 w-4" />{t("navbar.signOut")}
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  {t("navbar.signIn")}
                </Link>
                <motion.div whileTap={reduced ? {} : { scale: 0.96 }}>
                  <Link href="/register" className="btn-primary text-sm px-4 py-2">
                    {t("navbar.register")}
                  </Link>
                </motion.div>
              </div>
            )}

            {/* Mobile toggle */}
            <motion.button
              className="lg:hidden p-2.5 rounded-xl text-fg-muted hover:bg-surface-sunken"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileTap={reduced ? {} : { scale: 0.9 }}
              aria-label={t("common.menu")}
            >
              <span
                className="block transition-transform duration-150"
                style={{ transform: isMenuOpen ? "rotate(90deg)" : "rotate(0deg)" }}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: reduced ? 0.1 : 0.28, ease: EASE }}
              className="lg:hidden overflow-hidden border-t border-line"
            >
              <div className="py-3 space-y-1">
                <form action="/products" method="get" role="search" className="relative mb-2">
                  <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-fg-subtle" />
                  <input
                    type="search"
                    name="search"
                    placeholder={t("common.searchPlaceholder")}
                    aria-label={t("common.search")}
                    className="w-full rounded-xl border border-line bg-surface-sunken py-2.5 ps-9 pe-3 text-sm text-fg placeholder:text-fg-subtle focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  />
                </form>
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25, ease: EASE }}
                  >
                    <Link
                      href={link.href}
                      className="block px-3 py-2.5 text-sm font-medium text-fg-muted rounded-xl hover:bg-surface-sunken transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t(`nav.${link.key}`)}
                    </Link>
                  </motion.div>
                ))}
                {!session && (
                  <motion.div
                    className="flex gap-2 pt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.25 }}
                  >
                    <Link href="/login" className="flex-1 text-center px-4 py-2 text-sm font-medium border border-line rounded-xl">
                      {t("navbar.signIn")}
                    </Link>
                    <Link href="/register" className="flex-1 text-center btn-primary text-sm">
                      {t("navbar.register")}
                    </Link>
                  </motion.div>
                )}
                <div className="pt-2 flex justify-center">
                  <ThemeToggle />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
