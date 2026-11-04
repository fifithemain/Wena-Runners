import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How WENA Runners handles account, errand, payment and usage information.",
};

export default function PrivacyPage() {
  return (
    <main className="shell workspace-page" style={{ maxWidth: 900, paddingBottom: 60 }}>
      <header className="pagehead"><h1>Privacy policy</h1><p>Last updated: 4 November 2026</p><p>This notice explains how WENA Runners handles personal information when you use the South African errand marketplace.</p></header>
      <div className="panel" style={{ lineHeight: 1.7 }}>
        <h2>Who is responsible</h2>
        <p>WENA Runners is the service that connects customers and local Runners. The legal name, registered address and privacy contact details of the responsible operator must be confirmed and published here before launch. Until then, send privacy requests through the contact channel shown in your account, if available.</p>
        <h2>Information we handle</h2>
        <p>Depending on how you use the service, this can include your name, email address, phone number, account role and Runner zone; errand descriptions, budgets, pickup and drop-off details, offers and messages; receipts or proof-of-payment files; payment references and status; and Runner payout details you submit. We also receive basic technical and usage information such as device, browser, request and page-visit data.</p>
        <h2>Why we use it</h2>
        <p>We use this information to create and secure accounts, match customers and Runners, arrange errands, support messaging and hand-off confirmation, process payments and payout requests, prevent misuse, provide support, and operate and improve the service. We use optional site analytics only if you accept analytics in the cookie notice.</p>
        <h2>When information is shared</h2>
        <p>Information is shared with the people involved in an errand as needed to complete it. Pickup and drop-off details are withheld from other users until assignment. Service providers used by the app include Clerk for sign-in, Supabase for application data and file storage, Vercel for hosting and analytics, and Paystack for payment processing. These providers process information to deliver their services and may process it in other countries.</p>
        <h2>Cookies and local storage</h2>
        <p>Essential storage supports sign-in, security and your saved analytics choice. Optional Vercel Analytics is enabled only after you choose “Accept analytics”. You can clear the saved choice in your browser storage to see the choice again. Choosing “Essential only” disables optional analytics.</p>
        <h2>Retention and security</h2>
        <p>Information is retained for as long as needed to provide the service, resolve disputes, meet financial or legal obligations, and protect the platform. Access controls and server-side secrets are used to help protect data; no online service can promise absolute security. Contact the operator if you need account or data deletion guidance.</p>
        <h2>Your choices and rights</h2>
        <p>Subject to applicable law, you may request access to or correction of your personal information, ask for deletion where appropriate, or object to certain processing. You may also decline optional analytics. Requests should be made to the responsible operator once its contact details are published.</p>
        <h2>Children</h2>
        <p>The service is intended for adults who can enter into agreements and arrange errands. Do not create an account or submit another person’s information without authority to do so.</p>
        <h2>Changes</h2>
        <p>We may update this notice as the service changes. The “Last updated” date above will change when a revision is published.</p>
        <p style={{ marginTop: 28 }}><Link href="/">Back to WENA Runners</Link> · <Link href="/terms">Terms &amp; conditions</Link></p>
      </div>
    </main>
  );
}
