import { NextResponse } from "next/server";
import { PLANS, getCourse } from "@/lib/data";

/**
 * POST /api/payments/order — creates a payment order.
 *
 * Production flow (see docs/API.md):
 *  1. Authenticate the user (JWT) and validate the cart server-side —
 *     never trust client-sent amounts.
 *  2. Apply coupon from the `coupons` table (validity, usage limits, scope).
 *  3. Create a Razorpay order: razorpay.orders.create({ amount, currency: "INR",
 *     receipt, notes }) and persist a `payments` row in state `created`.
 *  4. Return { orderId, amount, key } for Razorpay Checkout on the client.
 *  5. A webhook (payment.captured / payment.failed) transitions the payment
 *     state and grants enrollment — the client success callback is only a hint.
 */
export async function POST(request: Request) {
  let body: { courseSlug?: string; planId?: string; coupon?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body." } }, { status: 400 });
  }

  const course = body.courseSlug ? getCourse(body.courseSlug) : undefined;
  const plan = body.planId ? PLANS.find((p) => p.id === body.planId) : undefined;
  if (!course && !plan) {
    return NextResponse.json({ error: { code: "ITEM_NOT_FOUND", message: "Provide a valid courseSlug or planId." } }, { status: 422 });
  }

  let amount = course ? course.price : plan!.yearly;
  const coupon = body.coupon?.toUpperCase();
  if (coupon === "LIGHT20") amount = Math.round(amount * 0.8);
  if (coupon === "WELCOME10") amount = Math.round(amount * 0.9);

  return NextResponse.json({
    data: {
      orderId: `order_demo_${Date.now()}`,
      amount: amount * 100, // paise, Razorpay convention
      currency: "INR",
      key: "rzp_test_demo_key",
      item: course ? course.title : `${plan!.name} Plan`,
    },
  });
}
