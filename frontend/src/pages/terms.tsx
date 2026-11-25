import { PublicFooter, PublicNav } from "../components/PublicNav";

/**
 * Terms of Service & safety — Housify only connects customers with
 * agents. It does not arrange viewings, hold money, or take
 * responsibility for what happens between a customer and an agent.
 */
export default function Terms() {
  return (
    <div className="public-site">
      <PublicNav />
      <main style={{ flex: 1, background: "var(--page)" }}>
        <div className="container-x" style={{ paddingTop: 32, paddingBottom: 56, maxWidth: 760 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: "0 0 6px" }}>Terms of Service</h1>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Last updated November 2026 · Housify is owned by StreixCorp.
          </p>

          <section className="card detail-section" style={{ marginTop: 20 }}>
            <h2>What Housify does</h2>
            <p>
              Housify is a listing platform that connects people looking for a
              home with the agents and landlords listing those homes. Agents
              publish listings with photos, videos and their contact details;
              customers browse listings and contact agents directly by
              WhatsApp or phone call.
            </p>
            <p>
              Housify does not own, manage or inspect the homes listed, does
              not arrange viewings, and does not collect rent or any payment
              on behalf of anyone. No payments are made on Housify.
            </p>
          </section>

          <section className="card detail-section" style={{ marginTop: 16 }}>
            <h2>Your safety is your responsibility</h2>
            <p>
              Housify only connects agents to users. Your security is not
              Housify&apos;s responsibility: what happens between you and an
              agent — including viewings, negotiations and payments — is
              between you and that agent, and each agent is responsible for
              their own conduct.
            </p>
            <p>Before you deal with any agent:</p>
            <ul style={{ lineHeight: 1.7, paddingLeft: 20 }}>
              <li>Check the agent&apos;s profile photo and reviews from other customers.</li>
              <li>View the home in person before paying anything.</li>
              <li>Meet in a safe, public place and tell someone where you are going.</li>
              <li>Never pay rent or a fee before you have seen the home and confirmed who you are paying.</li>
              <li>Get receipts and written agreements for every payment you make.</li>
            </ul>
            <p>
              Agents on Housify upload a photo of themselves for identity
              verification. That photo confirms the account belongs to the
              person pictured; it is not an endorsement of the agent, and
              Housify does not guarantee any agent&apos;s honesty or the
              condition of any home.
            </p>
          </section>

          <section className="card detail-section" style={{ marginTop: 16 }}>
            <h2>Agents and listings</h2>
            <p>Agents agree to:</p>
            <ul style={{ lineHeight: 1.7, paddingLeft: 20 }}>
              <li>Keep their contact details up to date, so customers can reach them.</li>
              <li>Keep each listing&apos;s status up to date — Available, Taken, Paid For or Rented Out. Listings whose status goes un-updated for a long time reduce the agent&apos;s public rating.</li>
              <li>Only list homes they are authorised to let, with honest photos, videos and prices.</li>
              <li>Remove or update a listing as soon as the home is no longer available.</li>
            </ul>
          </section>

          <section className="card detail-section" style={{ marginTop: 16 }}>
            <h2>Reviews</h2>
            <p>
              Customers may rate and review agents they have dealt with.
              Reviews must be honest and about your own experience. Housify
              may remove reviews that are abusive, false or unrelated to a
              real dealing.
            </p>
          </section>

          <section className="card detail-section" style={{ marginTop: 16 }}>
            <h2>Accounts</h2>
            <p>
              You are responsible for keeping your account details safe.
              Housify may suspend or remove accounts and listings that break
              these terms, mislead customers, or put others at risk. Admins
              may remove any user or listing.
            </p>
          </section>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
