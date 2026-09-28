import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { TIERS, COURIER_FEE, TierKey, FulfillmentType } from "@/lib/tiers";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    customerName,
    customerPhone,
    storeName,
    storeNote,
    itemNote,
    tier,
    fulfillmentType,
    deliveryLandmark,
    deliveryLat,
    deliveryLng,
  } = body as {
    customerName: string;
    customerPhone: string;
    storeName: string;
    storeNote?: string;
    itemNote?: string;
    tier: TierKey;
    fulfillmentType: FulfillmentType;
    deliveryLandmark?: string;
    deliveryLat?: number;
    deliveryLng?: number;
  };

  if (!customerName || !customerPhone || !storeName || !tier) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!(tier in TIERS)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (fulfillmentType === "delivery" && !deliveryLandmark) {
    return NextResponse.json(
      { error: "A landmark or address is needed for delivery" },
      { status: 400 }
    );
  }

  const shopperFee = TIERS[tier].runnerCut;
  const courierFee = fulfillmentType === "delivery" ? COURIER_FEE : 0;

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      customer_name: customerName,
      customer_phone: customerPhone,
      store_name: storeName,
      store_note: storeNote || null,
      item_note: itemNote || null,
      tier,
      shopper_fee: shopperFee,
      fulfillment_type: fulfillmentType,
      courier_fee: courierFee,
      delivery_landmark: fulfillmentType === "delivery" ? deliveryLandmark : null,
      delivery_lat: fulfillmentType === "delivery" ? deliveryLat ?? null : null,
      delivery_lng: fulfillmentType === "delivery" ? deliveryLng ?? null : null,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    job: data,
    totalPrice: TIERS[tier].fee + courierFee,
  });
}
