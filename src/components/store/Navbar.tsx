"use client";

import Link from "next/link";
import { SiteLogo } from "@/components/ui/site-logo";
import { useSession, signOut } from "next-auth/react";
import { useCartStore } from "@/store/cart";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ShoppingCart, User, LogOut, LayoutDashboard, Shield, Menu, X, ChevronDown, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CurrencySelector } from "@/components/store/CurrencySelector";

const navLinks = [
  { href: "/",         label: "الرئيسية" },
  { href: "/products", label: "المنتجات" },
  { href: "/blog",     label: "المدونة" },
  { href: "/faq",      label: "الأسئلة الشائعة" },
  { href: "/contact",  label: "اتصل بنا" },
];

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

export function Navbar() {
  const { data: session } = useSession();
  const { getTotalItems, toggleCart } = useCartStore();
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
          ? "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md border-b border-gray-200/50 dark:border-gray-700/50"
          : "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
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
              <span className="font-bold text-gray-900 dark:text-white text-base leading-tight block">متجرك الإلكتروني</span>
              <span className="text-xs text-primary-600 dark:text-primary-400 leading-tight block">أفضل الأسعار وأعلى جودة</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <CurrencySelector />
            <ThemeToggle className="hidden sm:flex" />

            {/* Cart */}
            <motion.button
              onClick={toggleCart}
              className="relative p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              whileTap={reduced ? {} : { scale: 0.9 }}
              aria-label="سلة التسوق"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  whileTap={reduced ? {} : { scale: 0.97 }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {session.user.name.charAt(0)}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
                    {session.user.name}
                  </span>
                  <motion.span
                    animate={{ rotate: isUserMenuOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-4 w-4 text-gray-400" />
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
                        className="absolute start-0 top-full mt-2 w-56 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-20 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{session.user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{session.user.email}</p>
                        </div>
                        <div className="py-1">
                          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setIsUserMenuOpen(false)}>
                            <LayoutDashboard className="h-4 w-4" />لوحة التحكم
                          </Link>
                          <Link href="/dashboard/notifications" className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setIsUserMenuOpen(false)}>
                            <Bell className="h-4 w-4" />الإشعارات
                          </Link>
                          {(session.user.role === "ADMIN" || session.user.role === "STAFF") && (
                            <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20" onClick={() => setIsUserMenuOpen(false)}>
                              <Shield className="h-4 w-4" />لوحة الإدارة
                            </Link>
                          )}
                          <hr className="my-1 border-gray-100 dark:border-gray-700" />
                          <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full">
                            <LogOut className="h-4 w-4" />تسجيل الخروج
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  تسجيل الدخول
                </Link>
                <motion.div whileTap={reduced ? {} : { scale: 0.96 }}>
                  <Link href="/register" className="btn-primary text-sm px-4 py-2">
                    إنشاء حساب
                  </Link>
                </motion.div>
              </div>
            )}

            {/* Mobile toggle */}
            <motion.button
              className="md:hidden p-2.5 rounded-xl text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileTap={reduced ? {} : { scale: 0.9 }}
              aria-label="القائمة"
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
              className="md:hidden overflow-hidden border-t border-gray-200 dark:border-gray-700"
            >
              <div className="py-3 space-y-1">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25, ease: EASE }}
                  >
                    <Link
                      href={link.href}
                      className="block px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.label}
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
                    <Link href="/login" className="flex-1 text-center px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-xl">
                      تسجيل الدخول
                    </Link>
                    <Link href="/register" className="flex-1 text-center btn-primary text-sm">
                      إنشاء حساب
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
