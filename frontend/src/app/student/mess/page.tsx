"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex-api";
import { RoleGate } from "@/components/auth/role-gate";
import { AppShell } from "@/components/layout/app-shell";
import { Card, EmptyState } from "@/components/ui";

type MealType = "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER";

export default function StudentMessPage() {
  const todayMenus = useQuery(api.mess.getTodayMenu, {});
  const myAttendance = useQuery(api.mess.listMealAttendance, {});
  const myFeedback = useQuery(api.mess.listFeedback, {});

  const submitFeedback = useMutation(api.mess.submitFeedback);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Feedback Form State
  const [feedbackForm, setFeedbackForm] = useState({
    mealType: "LUNCH" as MealType,
    date: todayStr,
    rating: 5,
    comment: "",
  });

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackForm.comment.trim()) {
      setMessage({ text: "Please enter your thoughts or feedback.", type: "error" });
      return;
    }

    try {
      setIsSubmitting(true);
      await submitFeedback({
        mealType: feedbackForm.mealType,
        date: feedbackForm.date,
        rating: feedbackForm.rating,
        comment: feedbackForm.comment.trim(),
      });

      setMessage({ text: "Thank you! Your dining feedback has been recorded.", type: "success" });
      setFeedbackForm({
        mealType: "LUNCH",
        date: todayStr,
        rating: 5,
        comment: "",
      });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to submit feedback.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <RoleGate role="STUDENT">
      <AppShell role="STUDENT">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Dining & Nutrition</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Hostel Mess & Dining</h1>
              <p className="mt-1 text-sm text-slate-500">
                Check today&apos;s meal schedule, review dining hall menus, and share food quality feedback.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs">
              <span>Today: {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "short", day: "numeric" })}</span>
            </div>
          </div>

          {/* Toast Notification */}
          {message && (
            <div
              className={`flex items-center justify-between rounded-xl p-4 text-sm font-medium ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20"
                  : "bg-rose-50 text-rose-800 ring-1 ring-rose-600/20"
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage(null)} className="text-slate-500 hover:text-slate-800 font-bold ml-4">
                ✕
              </button>
            </div>
          )}

          {/* Today's Meals Menu Grid */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">Today&apos;s Dining Menu</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {(["BREAKFAST", "LUNCH", "SNACKS", "DINNER"] as MealType[]).map((mType) => {
                const meal = todayMenus?.find((m: any) => m.mealType === mType);
                return (
                  <Card key={mType} className="p-5 border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              mType === "BREAKFAST"
                                ? "bg-amber-400"
                                : mType === "LUNCH"
                                ? "bg-emerald-500"
                                : mType === "SNACKS"
                                ? "bg-orange-400"
                                : "bg-indigo-500"
                            }`}
                          />
                          <h3 className="font-bold text-slate-900">{mType}</h3>
                        </div>
                        <span className="text-xs text-slate-400">
                          {mType === "BREAKFAST"
                            ? "07:30 - 09:30"
                            : mType === "LUNCH"
                            ? "12:30 - 14:30"
                            : mType === "SNACKS"
                            ? "17:00 - 18:00"
                            : "19:30 - 21:30"}
                        </span>
                      </div>

                      <div className="mt-4">
                        {meal ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-slate-800 whitespace-pre-line leading-relaxed">
                              {meal.items}
                            </p>
                            {meal.specialDietNote && (
                              <p className="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200/60">
                                <strong>Diet Note:</strong> {meal.specialDietNote}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="py-6 text-center text-xs text-slate-400 italic">Menu pending publication</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setFeedbackForm((prev) => ({ ...prev, mealType: mType }))}
                      className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 text-left pt-2 border-t border-slate-100"
                    >
                      ★ Rate this meal →
                    </button>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Feedback & Meal Attendance Split Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Submit Food Rating Form */}
            <Card className="p-6">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Rate Meal Quality</h3>
                <p className="text-xs text-slate-500">Your feedback helps improve campus food quality and hygiene.</p>
              </div>

              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Meal Session *</label>
                    <select
                      value={feedbackForm.mealType}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, mealType: e.target.value as MealType })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="BREAKFAST">Breakfast</option>
                      <option value="LUNCH">Lunch</option>
                      <option value="SNACKS">Snacks</option>
                      <option value="DINNER">Dinner</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Date *</label>
                    <input
                      type="date"
                      value={feedbackForm.date}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, date: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rating (1 to 5 Stars) *</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                        className={`text-2xl transition ${
                          star <= feedbackForm.rating ? "text-amber-400 scale-110" : "text-slate-200 hover:text-amber-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-slate-600">
                      {feedbackForm.rating === 5
                        ? "Excellent"
                        : feedbackForm.rating === 4
                        ? "Good"
                        : feedbackForm.rating === 3
                        ? "Average"
                        : feedbackForm.rating === 2
                        ? "Poor"
                        : "Very Poor"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Comments & Suggestions *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Tell us what was good or what can be improved regarding taste, temperature, hygiene..."
                    value={feedbackForm.comment}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              </form>
            </Card>

            {/* My Past Meal Attendance */}
            <Card className="overflow-hidden p-0 flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">My Meal Attendance</h3>
                  <p className="text-xs text-slate-500">Record of meals taken in the hostel dining hall.</p>
                </div>

                <div className="overflow-x-auto max-h-[340px]">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">Date</th>
                        <th className="px-4 py-2.5">Meal</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!myAttendance || myAttendance.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-6 text-center text-xs text-slate-400 italic">
                            No attendance records logged yet.
                          </td>
                        </tr>
                      ) : (
                        myAttendance.slice(0, 15).map((a: any) => (
                          <tr key={a._id} className="hover:bg-slate-50/60 transition text-xs">
                            <td className="px-4 py-3 font-medium text-slate-800">{a.date}</td>
                            <td className="px-4 py-3">{a.mealType}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                  a.status === "TAKEN"
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                                    : a.status === "SKIPPED"
                                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20"
                                    : "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20"
                                }`}
                              >
                                {a.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* My feedback review snippet */}
              {myFeedback && myFeedback.length > 0 && (
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                  <span>You have submitted {myFeedback.length} meal reviews.</span>
                  <span className="font-semibold text-slate-700">Thank you for helping us improve!</span>
                </div>
              )}
            </Card>
          </div>
        </div>
      </AppShell>
    </RoleGate>
  );
}

