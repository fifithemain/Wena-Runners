import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { TIERS, COURIER_FEE, TierKey, FulfillmentType } from "@/lib/tiers";
import { createYocoCheckout } from "@/lib/yoco";

function siteUrl(req: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const host = req.headers.get("host");
  const proto = host?.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const customerName = String(form.get("customerName") || "").trim();
    const customerPhone = String(form.get("customerPhone") || "").trim();
    const storeName = String(form.get("storeName") || "").trim();
    const storeNote = String(form.get("storeNote") || "").trim();
    const itemNote = String(form.get("itemNote") || "").trim();
    const tier = String(form.get("tier") || "") as TierKey;
    const fulfillmentType = String(form.get("fulfillmentType") || "") as FulfillmentType;
    const deliveryLandmark = String(form.get("deliveryLandmark") || "").trim();
    const deliveryLat = form.get("deliveryLat") ? Number(form.get("deliveryLat")) : undefined;
    const deliveryLng = form.get("deliveryLng") ? Number(form.get("deliveryLng")) : undefined;
    const slip = form.get("slip") as File | null;

    if (!customerName || !customerPhone || !storeName || !tier) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!(tier in TIERS)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }
    if (fulfillmentType === "delivery" && !deliveryLandmark) {
      return NextResponse.json({ error: "A landmark or address is needed for delivery" }, { status: 400 });
    }
    if (!slip || slip.size === 0) {
      return NextResponse.json(
        { error: "Please upload your proof of payment to the store" },
        { status: 400 }
      );
    }
    if (slip.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "That file is too large (max 8MB)" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    const ext = (slip.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const slipPath = `${customerPhone.replace(/\D/g, "")}-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await slip.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("store-slips")
      .upload(slipPath, bytes, { contentType: slip.type || "application/octet-stream" });
    if (uploadError) {
      return NextResponse.json({ error: "Could not upload your slip: " + uploadError.message }, { status: 500 });
    }

    const shopperFee = TIERS[tier].runnerCut;
    const courierFee = fulfillmentType === "delivery" ? COURIER_FEE : 0;
    const totalRand = shopperFee + courierFee;
    const collectionPin = randomPin();

    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        store_name: storeName,
        store_note: storeNote || null,
        item_note: itemNote || null,
        tier,
        shopper_fee: shopperFee,
        slip_path: slipPath,
        fulfillment_type: fulfillmentType,
        courier_fee: courierFee,
        delivery_landmark: fulfillmentType === "delivery" ? deliveryLandmark : null,
        delivery_lat: fulfillmentType === "delivery" ? deliveryLat ?? null : null,
        delivery_lng: fulfillmentType === "delivery" ? deliveryLng ?? null : null,
        collection_pin: collectionPin,
        status: "awaiting_payment",
        payment_status: "pending",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // No Yoco key configured yet — skip payment, put the job straight on
    // the board so the rest of the flow can still be tested.
    if (!process.env.YOCO_SECRET_KEY) {
      await supabase.from("jobs").update({ status: "open", payment_status: "paid" }).eq("id", job.id);
      return NextResponse.json({
        job,
        totalPrice: totalRand,
        collectionPin,
        skippedPayment: true,
      });
    }

    const base = siteUrl(req);
    const checkout = await createYocoCheckout({
      amountRand: totalRand,
      jobId: job.id,
      successUrl: `${base}/pay/success?job=${job.id}`,
      cancelUrl: `${base}/pay/cancelled?job=${job.id}`,
      failureUrl: `${base}/pay/cancelled?job=${job.id}`,
    });

    await supabase.from("jobs").update({ yoco_checkout_id: checkout.id }).eq("id", job.id);

    return NextResponse.json({ job, totalPrice: totalRand, checkoutUrl: checkout.redirectUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Something went wrong. Please try again." }, { status: 500 });
  }
}
