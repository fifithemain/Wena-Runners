import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "Terms for customers and Runners using the WENA Runners errand marketplace.",
};

export default function TermsPage() {
  return (
    <main className="shell workspace-page" style={{ maxWidth: 900, paddingBottom: 60 }}>
      <header className="pagehead"><h1>Terms &amp; conditions</h1><p>Last updated: 4 November 2026</p><p>These terms describe the basic rules for using WENA Runners in South Africa. By using the service, you agree to follow them.</p></header>
      <div className="panel" style={{ lineHeight: 1.7 }}>
        <h2>About the service</h2>
        <p>WENA Runners provides an online marketplace for customers to post errands and for local Runners to make offers. Customers choose a budget and may accept or counter offers. A customer and Runner form their own arrangement for the errand. WENA Runners is not a courier or employer of a Runner and does not perform errands itself.</p>
        <h2>Accounts and eligibility</h2>
        <p>You must provide accurate account details, keep your sign-in credentials secure and use only your own account. You must be legally able to enter into the arrangements you make through the service. Runner verification is an account status and is not a guarantee of a person’s conduct or the outcome of an errand.</p>
        <h2>Errands and safe use</h2>
        <p>Post accurate details and a realistic budget. Do not request or accept illegal, unsafe, deceptive or prohibited activity. Do not share another person’s private information unless it is necessary and you have authority to share it. Users must communicate respectfully and follow applicable laws.</p>
        <h2>Offers, payments and fees</h2>
        <p>The customer and Runner agree the errand price through the offer flow. Before payment, review the agreed amount, any service fee and total shown at checkout. Payments are processed by Paystack under its applicable terms. Do not treat an errand as active until the service confirms payment. Runner earnings and payout requests are subject to the amounts shown in the account and the payout process available at that time.</p>
        <h2>Completion and disputes</h2>
        <p>Keep communications and hand-off details within the service where practical. The customer confirms completion using the private hand-off PIN. Do not share that PIN before the errand is complete. If an errand is delayed, unsafe or disputed, use the available in-app messaging and account tools to contact the other participant and preserve relevant information.</p>
        <h2>Suspension and availability</h2>
        <p>We may restrict or suspend access where reasonably needed to protect users, investigate misuse, comply with law or maintain the service. The service may change or be temporarily unavailable. We will not use this section to remove rights that cannot be limited under applicable law.</p>
        <h2>Responsibility</h2>
        <p>Users are responsible for the accuracy of their posts and for arrangements they make with each other. Nothing in these terms excludes or limits a right or remedy that cannot lawfully be excluded or limited. To the extent permitted by law, WENA Runners is not responsible for a user’s independent conduct or an errand arrangement between users.</p>
        <h2>Changes and contact</h2>
        <p>We may update these terms and will change the date above when we do. The legal name and contact details of the WENA Runners operator must be added before launch. Until then, use the contact channel shown in your account, if available, for questions about these terms.</p>
        <p style={{ marginTop: 28 }}><Link href="/">Back to WENA Runners</Link> · <Link href="/privacy">Privacy policy</Link></p>
      </div>
    </main>
  );
}
