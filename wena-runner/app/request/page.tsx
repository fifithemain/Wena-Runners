import { redirect } from "next/navigation";

// The request wizard now lives on the home page.
export default function RequestPage() {
  redirect("/#wizard");
}
