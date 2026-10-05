import Link from "next/link";
import PublicNavBar from "@/components/common/PublicNavBar";
import {
  Building2,
  Users,
  BedDouble,
  CalendarCheck,
  FileText,
  ArrowRightLeft,
  Megaphone,
  History,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Lock,
  Layers,
  Clock,
  Compass,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-800 selection:bg-indigo-500 selection:text-white">
      {/* Top Glass Navbar */}
      <PublicNavBar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-slate-50 to-white py-20 lg:py-28" id="home">
        {/* Subtle decorative glow blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-indigo-300/20 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse-subtle" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-teal-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs">
                <Sparkles size={14} className="text-indigo-600 animate-spin-slow" />
                <span>Next-Generation Residential Campus Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.12]">
                Smart Hostel Management,{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-teal-600 bg-clip-text text-transparent">
                  Simplified.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
                Streamline student occupancy, room & bed allocations, daily biometric attendance, maintenance tickets, and residential security from one unified platform.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Access Portal</span>
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  <span>Explore Features</span>
                </Link>
              </div>

              {/* Key Highlights row */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-2xl font-bold text-slate-900">99.9%</p>
                  <p className="text-xs text-slate-500 font-medium">System Uptime</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-600">Zero</p>
                  <p className="text-xs text-slate-500 font-medium">Double Bookings</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">100%</p>
                  <p className="text-xs text-slate-500 font-medium">Role Isolated</p>
                </div>
              </div>
            </div>

            {/* Right Graphic / Image Display with Floating Badges */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Modern Campus/Hostel Image */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1000&q=80"
                    alt="Modern student residence hostel architecture"
                    className="w-full h-[420px] object-cover hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-sm font-semibold">Campus Residences & Hostels</p>
                    <p className="text-xs text-slate-200">State-of-the-art residential facility operations</p>
                  </div>
                </div>

                {/* Floating Glass Stats Card 1 (Top Left) */}
                <div className="absolute -top-4 -left-4 sm:-left-6 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur-md animate-float">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupancy Rate</p>
                      <p className="text-xl font-bold text-slate-900">94.2%</p>
                    </div>
                  </div>
                </div>

                {/* Floating Glass Stats Card 2 (Bottom Right) */}
                <div
                  className="absolute -bottom-5 -right-4 sm:-right-6 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur-md animate-float"
                  style={{ animationDelay: "2s" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                      <BedDouble size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Residents</p>
                      <p className="text-xl font-bold text-indigo-600">500+ Students</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Highlights Strip */}
      <section className="border-y border-slate-200/80 bg-slate-50/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="h-6 w-6 text-indigo-600 mb-1.5" />
              <h4 className="text-sm font-bold text-slate-900">Enterprise Security</h4>
              <p className="text-xs text-slate-500">Clerk & Convex JWT isolation</p>
            </div>
            <div className="flex flex-col items-center">
              <CalendarCheck className="h-6 w-6 text-emerald-600 mb-1.5" />
              <h4 className="text-sm font-bold text-slate-900">Live Attendance</h4>
              <p className="text-xs text-slate-500">Daily verification & compliance</p>
            </div>
            <div className="flex flex-col items-center">
              <ArrowRightLeft className="h-6 w-6 text-indigo-600 mb-1.5" />
              <h4 className="text-sm font-bold text-slate-900">Room Transfers</h4>
              <p className="text-xs text-slate-500">Automated warden workflows</p>
            </div>
            <div className="flex flex-col items-center">
              <History className="h-6 w-6 text-teal-600 mb-1.5" />
              <h4 className="text-sm font-bold text-slate-900">Audit Logging</h4>
              <p className="text-xs text-slate-500">Full administrative visibility</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 lg:py-28" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Core Capabilities</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Complete Residential Lifecycle Management
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Designed specifically for university campuses and student residential complexes to replace error-prone manual spreadsheets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Building2,
                title: "Hostel Hierarchy",
                description: "Map hostels, blocks, floors, rooms and beds with capacity tracking.",
                badge: "Infrastructure",
              },
              {
                icon: Users,
                title: "Student Roster",
                description: "Maintain verified academic enrollment, contacts, and guardian profiles.",
                badge: "Directory",
              },
              {
                icon: BedDouble,
                title: "Smart Allocation",
                description: "Single-click room assignment with atomic checkouts and bed status updates.",
                badge: "Operations",
              },
              {
                icon: CalendarCheck,
                title: "Daily Attendance",
                description: "Log daily residential attendance, leaves, and absences with real-time stats.",
                badge: "Compliance",
              },
              {
                icon: FileText,
                title: "Ticketing & Requests",
                description: "Maintenance complaints, room repairs, and leave tickets with review flows.",
                badge: "Support",
              },
              {
                icon: ArrowRightLeft,
                title: "Transfer Requests",
                description: "Smooth room reallocation requests with warden approval safeguards.",
                badge: "Mobility",
              },
              {
                icon: Megaphone,
                title: "Broadcast Notices",
                description: "Publish announcements targeted by hostel, role, or campus-wide.",
                badge: "Communication",
              },
              {
                icon: History,
                title: "System Audit Logs",
                description: "Immutable history of administrator actions, allocations, and edits.",
                badge: "Security",
              },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Icon size={22} />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {f.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-slate-50/80 py-20 lg:py-24 border-y border-slate-200/80" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Workflow</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              How CampusNest Works
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Four streamlined steps from setup to operational control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Setup Facilities",
                desc: "Configure residential hostels, blocks, floors, and available bed inventories.",
              },
              {
                step: "02",
                title: "Enrol Students",
                desc: "Import or register student residents and assign them to eligible hostel rooms.",
              },
              {
                step: "03",
                title: "Daily Operations",
                desc: "Wardens track attendance, approve transfer tickets, and resolve room maintenance.",
              },
              {
                step: "04",
                title: "Monitor & Audit",
                desc: "Access live occupancy analytics, system reports, and tamper-resistant audit logs.",
              },
            ].map((s, idx) => (
              <div key={s.step} className="relative rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs">
                <span className="text-3xl font-extrabold text-indigo-100 font-mono">{s.step}</span>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Based Experience */}
      <section className="py-20 lg:py-28" id="roles">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Access Portals</span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Tailored for Every Campus Stakeholder
            </h2>
            <p className="mt-3 text-base text-slate-600">
              RoleGate guarantees strictly isolated views and operational permissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Admin Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20 mb-6">
                  <ShieldCheck size={26} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Administrator</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Total system administration, campus-wide facility oversight, and warden staff assignments.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Manage all Hostels, Blocks & Beds</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Warden assignments & user activation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>System-wide audit logs & security</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                >
                  <span>Admin Portal</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Warden Card */}
            <div className="rounded-3xl border-2 border-indigo-600 bg-white p-8 shadow-xl relative flex flex-col justify-between">
              <div className="absolute -top-3.5 right-6 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                Operational Staff
              </div>
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 mb-6">
                  <Building2 size={26} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Hostel Warden</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Day-to-day operations for assigned hostel blocks, attendance logging, and room allocations.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-600" />
                    <span>Mark daily student attendance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-600" />
                    <span>Approve or reject room transfer tickets</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-600" />
                    <span>Resolve student maintenance tickets</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
                >
                  <span>Warden Portal</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Student Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all flex flex-col justify-between">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 mb-6">
                  <Users size={26} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Student Resident</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Transparent personal view of accommodation, attendance history, tickets, and notices.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-600" />
                    <span>View assigned room & bed allocation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-600" />
                    <span>Track monthly attendance percentage</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-600" />
                    <span>Submit room change & maintenance tickets</span>
                  </li>
                </ul>
              </div>
              <div className="mt-8 pt-4 border-t border-slate-100">
                <Link
                  href="/login"
                  className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1.5"
                >
                  <span>Student Portal</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Architecture Highlights */}
      <section className="bg-slate-900 text-white py-20" id="security">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Institutional Security</span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Engineered for High-Consequence Campus Environments
              </h2>
              <p className="mt-4 text-slate-400 leading-relaxed">
                CampusNest uses end-to-end security layers including Clerk authentication, server-verified Convex queries, and strict role gates to prevent cross-hostel IDOR or privilege escalation.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-indigo-950 p-2 text-indigo-400 border border-indigo-800/50">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Full Identity Verification</h4>
                    <p className="text-xs text-slate-400">Clerk session tokens validated on every Convex mutation.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-indigo-950 p-2 text-indigo-400 border border-indigo-800/50">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Hostel-Level Boundary Isolation</h4>
                    <p className="text-xs text-slate-400">Wardens are strictly restricted to assigned facilities only.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 overflow-hidden">
              {/* Modern Accommodations Visual */}
              <img
                src="https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80"
                alt="Student campus residence interior"
                loading="lazy"
                className="w-full h-64 object-cover rounded-xl opacity-90 hover:opacity-100 transition-opacity"
              />
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Secure Cloud Deployment</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Active & Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-teal-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready for Effortless Hostel Administration?
          </h2>
          <p className="text-base text-indigo-100 max-w-xl mx-auto">
            Log in to the dashboard to begin managing campus residential facilities, attendance, and student allocations.
          </p>
          <div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-indigo-700 shadow-xl hover:bg-slate-50 hover:scale-105 active:scale-95 transition-all"
            >
              <span>Login to CampusNest</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">CampusNest Hostel System</p>
              <p className="text-xs text-slate-500">Enterprise hostel & residence operations</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-xs font-medium">
            <Link href="#home" className="hover:text-white transition">Overview</Link>
            <Link href="#features" className="hover:text-white transition">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition">Workflow</Link>
            <Link href="#roles" className="hover:text-white transition">Roles</Link>
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition">Portal Login</Link>
          </div>
          <div className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} CampusNest. Built with Next.js, Clerk & Convex.
          </div>
        </div>
      </footer>
    </div>
  );
}
