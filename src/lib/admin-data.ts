/** Demo analytics + management data for the admin panel. */

export const REVENUE_MONTHLY = [
  { month: "Aug", revenue: 18.4 },
  { month: "Sep", revenue: 22.1 },
  { month: "Oct", revenue: 27.8 },
  { month: "Nov", revenue: 25.2 },
  { month: "Dec", revenue: 31.6 },
  { month: "Jan", revenue: 38.9 },
  { month: "Feb", revenue: 41.2 },
  { month: "Mar", revenue: 47.5 },
  { month: "Apr", revenue: 44.1 },
  { month: "May", revenue: 52.3 },
  { month: "Jun", revenue: 58.7 },
]; // in ₹ lakh

export const REVENUE_BY_PLAN = [
  { plan: "Beacon", value: 46 },
  { plan: "Lighthouse", value: 33 },
  { plan: "Courses (one-time)", value: 21 },
]; // % share

export const ENROLLMENTS_BY_CATEGORY = [
  { category: "Urdu Language", count: 8420 },
  { category: "Spoken English", count: 7180 },
  { category: "Urdu Poetry", count: 5940 },
  { category: "English Grammar & Writing", count: 4210 },
  { category: "Persian Language", count: 2860 },
  { category: "Persian Poetry & Calligraphy", count: 1940 },
];

export const ADMIN_STUDENTS = [
  { id: "u1042", name: "Riya Sharma", email: "riya.s@example.com", plan: "Lighthouse", joined: "2025-04-12", courses: 4, lastActive: "2h ago", status: "Active" },
  { id: "u2381", name: "Mohammed Irfan", email: "irfan.m@example.com", plan: "Beacon", joined: "2025-09-03", courses: 2, lastActive: "1d ago", status: "Active" },
  { id: "u0917", name: "Ananya Bose", email: "ananya.b@example.com", plan: "Spark", joined: "2026-01-22", courses: 1, lastActive: "3h ago", status: "Active" },
  { id: "u3306", name: "Vikram Nair", email: "vikram.n@example.com", plan: "Beacon", joined: "2025-11-18", courses: 3, lastActive: "6d ago", status: "Active" },
  { id: "u1288", name: "Priya Deshmukh", email: "priya.d@example.com", plan: "Lighthouse", joined: "2025-06-30", courses: 5, lastActive: "45m ago", status: "Active" },
  { id: "u4450", name: "Arjun Reddy", email: "arjun.r@example.com", plan: "Spark", joined: "2026-03-08", courses: 1, lastActive: "12d ago", status: "Dormant" },
  { id: "u2094", name: "Zoya Ahmed", email: "zoya.a@example.com", plan: "Beacon", joined: "2025-08-14", courses: 3, lastActive: "1h ago", status: "Active" },
  { id: "u3871", name: "Karan Singh", email: "karan.s@example.com", plan: "Beacon", joined: "2026-02-11", courses: 2, lastActive: "4h ago", status: "Active" },
];

export const ADMIN_PAYMENTS = [
  { id: "pay_O8x2Kd91", date: "2026-07-03", student: "Priya Deshmukh", item: "Lighthouse Plan (yearly)", amount: 12999, method: "UPI", status: "Captured" },
  { id: "pay_O8w9Fh34", date: "2026-07-03", student: "Karan Singh", item: "IELTS Band 7+: Complete Preparation", amount: 3999, method: "Card", status: "Captured" },
  { id: "pay_O8vLp202", date: "2026-07-02", student: "Ananya Bose", item: "Urdu Script: Zero to Reading", amount: 1499, method: "UPI", status: "Captured" },
  { id: "pay_O8uQr577", date: "2026-07-02", student: "Rahul Menon", item: "Urdu Complete: One-Year Immersion", amount: 11999, method: "EMI (6mo)", status: "Captured" },
  { id: "pay_O8tBn810", date: "2026-07-01", student: "Sneha Patil", item: "Beacon Plan (yearly)", amount: 6999, method: "Netbanking", status: "Captured" },
  { id: "pay_O8sMx445", date: "2026-07-01", student: "Vikram Nair", item: "The Art of the Ghazal", amount: 1999, method: "Card", status: "Refunded" },
  { id: "pay_O8rTz190", date: "2026-06-30", student: "Zoya Ahmed", item: "Persian from Zero: Read, Write, Speak", amount: 2299, method: "UPI", status: "Captured" },
];

export const ADMIN_COUPONS = [
  { code: "LIGHT20", discount: "20% off", uses: 1841, limit: 5000, expires: "2026-08-31", status: "Active" },
  { code: "WELCOME10", discount: "10% off", uses: 6203, limit: null, expires: null, status: "Active" },
  { code: "MUSHAIRA50", discount: "₹500 off ghazal courses", uses: 312, limit: 1000, expires: "2026-07-15", status: "Active" },
  { code: "SUMMER25", discount: "25% off", uses: 4890, limit: 5000, expires: "2026-06-30", status: "Expired" },
];
