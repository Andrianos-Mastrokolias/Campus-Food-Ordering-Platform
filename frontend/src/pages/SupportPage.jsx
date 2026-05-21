// Import React Router link component
// This allows us to create navigation links between pages
import { Link } from "react-router-dom";

// Import the CSS file specifically for this page
import "./SupportPage.css";

// ------------------------------------------------------
// SUPPORT PAGE
// ------------------------------------------------------
// This page provides:
// 1. A disclaimer about cancellations
// 2. Contact information for support queries
// 3. Instructions for students to include Order IDs
//
// This improves the professionalism of the platform
// and gives students guidance if issues occur.
// ------------------------------------------------------

export default function SupportPage() {
  return (
    <main className="support-page">

  {/* Main heading */}
  <header>
    <h1>Customer Support & Order Policy</h1>
  </header>

  {/* Introductory message */}
  <p className="support-intro">
    Please read the following information carefully before placing an order.
  </p>

  {/* -------------------------------------------------- */}
  {/* ORDER POLICY SECTION */}
  {/* -------------------------------------------------- */}
  <section className="support-card">

    <h2>Order Cancellation Policy</h2>

    <p>
      Once an order has been placed and confirmed, it cannot be cancelled.
    </p>

    <p>
      Vendors begin preparing orders immediately after confirmation,
      therefore cancellations are not supported on the platform.
    </p>

  </section>

  {/* -------------------------------------------------- */}
  {/* CUSTOMER SUPPORT SECTION */}
  {/* -------------------------------------------------- */}
  <section className="support-card">

    <h2>Need Help With Your Order?</h2>

    <p>
      If you experience issues with a completed order,
      please contact our support team using the email below:
    </p>

    {/* Support email */}
    <address className="support-email">
      support.campusfoodapp@gmail.com
    </address>

    {/* Helpful instruction for users */}
    <p>
      Please include your <strong>Order ID</strong> in the subject line
      of your email so that we can assist you faster.
    </p>

    {/* Example shown to the user */}
    <aside className="example-box">
      Example Subject: Order #A12345
    </aside>

  </section>

  {/* -------------------------------------------------- */}
  {/* NAVIGATION BACK TO HOME */}
  {/* -------------------------------------------------- */}
  <nav>
    <Link to="/home" className="back-btn">
      ← Return to Dashboard
    </Link>
  </nav>

</main>
  );
}