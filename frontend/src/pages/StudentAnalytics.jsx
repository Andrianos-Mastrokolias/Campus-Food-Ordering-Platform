/* -------------------------------------------------- */
/* REACT HOOK IMPORTS                                 */
/* useEffect -> handles side effects                  */
/* useMemo   -> memoises expensive calculations       */
/* useState  -> stores local component state          */
/* -------------------------------------------------- */
import { useEffect, useMemo, useState } from "react";

/* -------------------------------------------------- */
/* FIRESTORE IMPORTS                                  */
/* collection -> references Firestore collections     */
/* getDocs   -> retrieves documents from Firestore    */
/* query     -> creates filtered database queries     */
/* where     -> applies query filtering conditions    */
/* -------------------------------------------------- */
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

/* -------------------------------------------------- */
/* RECHARTS IMPORTS                                   */
/* Used to generate analytics graphs and charts       */
/* -------------------------------------------------- */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/* -------------------------------------------------- */
/* FIREBASE DATABASE INSTANCE                         */
/* Provides connection to Firestore database          */
/* -------------------------------------------------- */
import { db } from "../firebase";

/* -------------------------------------------------- */
/* AUTHENTICATION CONTEXT                             */
/* Provides logged-in user information                */
/* such as role, uid, and loading state               */
/* -------------------------------------------------- */
import { useAuth } from "../context/AuthContext";

/* -------------------------------------------------- */
/* EXPORT UTILITIES                                   */
/* Allows analytics reports to be exported            */
/* as CSV and PDF files                               */
/* -------------------------------------------------- */
import { exportToCSV } from "../utils/exportCSV";
import { exportToPDF } from "../utils/exportPDF";
import "./StudentAnalytics.css";

export default function StudentAnalytics() {

  /* -------------------------------------------------- */
  /* AUTHENTICATED USER INFORMATION                    */
  /* loading tracks whether Firebase auth is still     */
  /* checking login state                              */
  /* -------------------------------------------------- */
  const { user, loading } = useAuth();

  /* -------------------------------------------------- */
  /* STORES ALL ORDERS BELONGING TO THE CURRENT        */
  /* STUDENT                                            */
  /* -------------------------------------------------- */
  const [orders, setOrders] = useState([]);

  /* -------------------------------------------------- */
  /* Tracks whether analytics data is currently being   */
  /* fetched from Firestore                            */
  /* -------------------------------------------------- */
  const [fetching, setFetching] = useState(true);

  /* -------------------------------------------------- */
  /* FETCH STUDENT ORDERS FROM FIRESTORE               */
  /* Runs whenever the authenticated user changes       */
  /* -------------------------------------------------- */
  useEffect(() => {

    const fetchStudentOrders = async () => {

      /* Wait until auth loading finishes */
      if (loading) return;

      /* Stop fetching if no user exists */
      if (!user) {
          setFetching(false);
          return;
      }

      try {

        setFetching(true);

        /* Reference to the orders collection */
        const ordersRef = collection(db, "orders");

        /* Query only orders that belong to the current student */
        const q = query(
          ordersRef,
          where("studentId", "==", user.uid)
        );

        /* Execute Firestore query */
        const snapshot = await getDocs(q);

        /* Convert Firestore documents into plain JavaScript objects */
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        /* Save orders into component state */
        setOrders(data);

      } catch (error) {

        console.error("Error fetching student analytics:", error.message);

      } finally {

        /* Stop loading state once fetch completes */
        setFetching(false);
      }
    };

    fetchStudentOrders();

  }, [user, loading]);

  /* -------------------------------------------------- */
  /* RETURNS A SAFE ORDER TOTAL VALUE                  */
  /* Handles missing or differently named fields       */
  /* -------------------------------------------------- */
  const getOrderTotal = (order) => {
    return Number(order.total ?? order.totalAmount ?? 0);
  };

  /* -------------------------------------------------- */
  /* TOTAL AMOUNT SPENT ACROSS ALL ORDERS              */
  /* -------------------------------------------------- */
  const totalSpent = orders.reduce(
    (sum, order) => sum + getOrderTotal(order),
    0
  );

  /* -------------------------------------------------- */
  /* TOTAL NUMBER OF ORDERS PLACED                     */
  /* -------------------------------------------------- */
  const totalOrders = orders.length;

  /* -------------------------------------------------- */
  /* AVERAGE AMOUNT SPENT PER ORDER                    */
  /* -------------------------------------------------- */
  const averageSpend =
    totalOrders > 0 ? totalSpent / totalOrders : 0;

  /* -------------------------------------------------- */
  /* GROUPS SPENDING DATA BY DATE FOR GRAPH DISPLAY    */
  /* useMemo prevents recalculating unless orders      */
  /* actually change                                   */
  /* -------------------------------------------------- */
  const spendingByDate = useMemo(() => {

    const grouped = {};

    orders.forEach((order) => {

      /* Convert Firestore timestamp into readable date */
      const date = order.createdAt?.toDate
        ? order.createdAt.toDate().toISOString().split("T")[0]
        : "Unknown";

      /* Create date entry if it does not exist yet */
      if (!grouped[date]) {
        grouped[date] = {
          date,
          spent: 0,
        };
      }

      /* Add spending total for that date */
      grouped[date].spent += getOrderTotal(order);
    });

    /* Sort dates chronologically */
    return Object.values(grouped).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

  }, [orders]);

  const orderHistoryRows = useMemo(() => {

    return orders.map((order) => ({

      orderId: order.id,

      vendorId: order.vendorId || "",

      status: order.status || "",

      total: getOrderTotal(order).toFixed(2),

      date: order.createdAt?.toDate
        ? order.createdAt.toDate().toLocaleString()
        : "Unknown",

      itemCount: order.items?.length || 0,
    }));

  }, [orders]);

  if (loading || fetching) {
    return (
      <p className="student-analytics-loading">
        Loading student analytics...
      </p>
    );
  }

  return (
    /* -------------------------------------------------- */
/* MAIN STUDENT ANALYTICS PAGE                        */
/* Wrapper for the entire student analytics dashboard */
/* -------------------------------------------------- */
<main className="student-analytics-page">

  {/* -------------------------------------------------- */}
  {/* PAGE HEADER                                        */}
  {/* Displays analytics dashboard title and subtitle    */}
  {/* -------------------------------------------------- */}
  <header className="student-analytics-header">

    <h1>My Order Analytics</h1>

    <p>
      Track your spending and order history.
    </p>

  </header>

  {/* -------------------------------------------------- */}
  {/* STUDENT SUMMARY CARDS                              */}
  {/* Displays high-level student spending statistics    */}
  {/* -------------------------------------------------- */}
  <section
    className="student-summary"
    aria-label="Student analytics summary"
  >

    {/* Total money spent summary */}
    <article className="student-summary-card">

      <h3>Total Spent</h3>

      <p>
        R{totalSpent.toFixed(2)}
      </p>

    </article>

    {/* Total number of orders summary */}
    <article className="student-summary-card">

      <h3>Total Orders</h3>

      <p>{totalOrders}</p>

    </article>

    {/* Average spending summary */}
    <article className="student-summary-card">

      <h3>Average Spend</h3>

      <p>
        R{averageSpend.toFixed(2)}
      </p>

    </article>

  </section>

  {/* -------------------------------------------------- */}
  {/* SPENDING OVER TIME REPORT                          */}
  {/* Displays student spending trends using bar chart   */}
  {/* -------------------------------------------------- */}
  <section className="student-analytics-card">

    <header className="student-report-header">

      <h2>Spending Over Time</h2>

      {/* Export controls */}
      <nav
        aria-label="Spending report export options"
      >

        <button
          onClick={() =>
            exportToCSV(
              "student-spending",
              spendingByDate
            )
          }
        >
          Export CSV
        </button>

        <button
          onClick={() =>
            exportToPDF(
              "Student Spending",
              spendingByDate
            )
          }
        >
          Export PDF
        </button>

      </nav>

    </header>

    {/* Display message if no spending data exists */}
    {spendingByDate.length === 0 ? (

      <p>No spending data available.</p>

    ) : (

      /* Responsive chart container */
      <figure
        style={{
          minWidth: "700px",
          height: "350px",
        }}
      >

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          {/* Bar chart displaying spending totals */}
          <BarChart
            data={spendingByDate}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >

            {/* Background grid lines */}
            <CartesianGrid
              strokeDasharray="3 3"
            />

            {/* X-axis displays order dates */}
            <XAxis
              dataKey="date"
              angle={-35}
              textAnchor="end"
              interval={0}
            />

            {/* Y-axis displays spending totals */}
            <YAxis />

            {/* Hover tooltip */}
            <Tooltip />

            {/* Spending bars */}
            <Bar
              dataKey="spent"
              barSize={60}
            />

          </BarChart>

        </ResponsiveContainer>

      </figure>
    )}

  </section>

  {/* -------------------------------------------------- */}
  {/* ORDER HISTORY REPORT                               */}
  {/* Displays detailed student order history table      */}
  {/* -------------------------------------------------- */}
  <section className="student-analytics-card">

    <header className="student-report-header">

      <h2>Order History</h2>

      {/* Export controls */}
      <nav
        aria-label="Order history export options"
      >

        <button
          onClick={() =>
            exportToCSV(
              "student-order-history",
              orderHistoryRows
            )
          }
        >
          Export CSV
        </button>

        <button
          onClick={() =>
            exportToPDF(
              "Student Order History",
              orderHistoryRows
            )
          }
        >
          Export PDF
        </button>

      </nav>

    </header>

    {/* Display message if no orders exist */}
    {orderHistoryRows.length === 0 ? (

      <p>
        You have not placed any orders yet.
      </p>

    ) : (

      /* Responsive order history table wrapper */
      <section
        className="student-table-wrapper"
        aria-label="Student order history table"
      >

        {/* Student order history table */}
        <table className="student-analytics-table">

          {/* Table headings */}
          <thead>

            <tr>

              <th>Order ID</th>

              <th>Vendor ID</th>

              <th>Status</th>

              <th>Total</th>

              <th>Date</th>

              <th>Items</th>

            </tr>

          </thead>

          {/* Table body */}
          <tbody>

            {/* Generate rows dynamically */}
            {orderHistoryRows.map((row) => (

              <tr key={row.orderId}>

                {/* Shortened order ID */}
                <td>
                  {row.orderId.slice(0, 6)}
                </td>

                {/* Vendor ID */}
                <td>{row.vendorId}</td>

                {/* Order status */}
                <td>{row.status}</td>

                {/* Total order price */}
                <td>R{row.total}</td>

                {/* Order date */}
                <td>{row.date}</td>

                {/* Number of items in order */}
                <td>{row.itemCount}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </section>
    )}

  </section>

</main>
  );
}