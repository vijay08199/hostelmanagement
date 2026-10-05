"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Building2, Menu, X, ArrowRight } from "lucide-react";

export default function PublicNavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Overview", href: "#home" },
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Roles", href: "#roles" },
    { name: "Security", href: "#security" },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm"
          : "border-b border-slate-100 bg-white/70 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-18 items-center py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Building2 size={22} />
            </div>
            <div>
              <span className="block font-bold text-lg tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                CampusNest
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Hostel Management SaaS
              </span>
            </div>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex space-x-7 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-indigo-600 hover:after:w-full after:transition-all"
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm shadow-indigo-600/30 hover:bg-indigo-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>Portal Login</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              type="button"
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 focus:outline-none transition"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-2 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/50 transition"
              onClick={() => setMobileOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold shadow-sm hover:bg-indigo-700 transition"
              onClick={() => setMobileOpen(false)}
            >
              <span>Portal Login</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
