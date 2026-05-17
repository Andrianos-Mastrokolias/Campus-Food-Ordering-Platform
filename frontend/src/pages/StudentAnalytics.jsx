import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
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
    <div className="student-analytics-page">
      <header className="student-analytics-header">
        <h1>My Order Analytics</h1>
        <p>Track your spending and order history.</p>
      </header>

      <section className="student-summary">
        <div className="student-summary-card">
          <h3>Total Spent</h3>
          <p>R{totalSpent.toFixed(2)}</p>
        </div>

        <div className="student-summary-card">
          <h3>Total Orders</h3>
          <p>{totalOrders}</p>
        </div>

        <div className="student-summary-card">
          <h3>Average Spend</h3>
          <p>R{averageSpend.toFixed(2)}</p>
        </div>
      </section>

      <section className="student-analytics-card">
        <div className="student-report-header">
          <h2>Spending Over Time</h2>

          <div>
            <button onClick={() => exportToCSV("student-spending", spendingByDate)}>
              Export CSV
            </button>

            <button onClick={() => exportToPDF("Student Spending", spendingByDate)}>
              Export PDF
            </button>
          </div>
        </div>

        {spendingByDate.length === 0 ? (
          <p>No spending data available.</p>
        ) : (
<div style={{ minWidth: "700px", height: "350px" }}>
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={spendingByDate}
      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
    >
      <CartesianGrid strokeDasharray="3 3" />

      <XAxis
        dataKey="date"
        angle={-35}
        textAnchor="end"
        interval={0}
      />

      <YAxis />

      <Tooltip />

      <Bar dataKey="spent" barSize={60} />
    </BarChart>
  </ResponsiveContainer>
</div>
        )}
      </section>

      <section className="student-analytics-card">
        <div className="student-report-header">
          <h2>Order History</h2>

          <div>
            <button onClick={() => exportToCSV("student-order-history", orderHistoryRows)}>
              Export CSV
            </button>

            <button onClick={() => exportToPDF("Student Order History", orderHistoryRows)}>
              Export PDF
            </button>
          </div>
        </div>

        {orderHistoryRows.length === 0 ? (
          <p>You have not placed any orders yet.</p>
        ) : (
          <div className="student-table-wrapper">
            <table className="student-analytics-table">
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

              <tbody>
                {orderHistoryRows.map((row) => (
                  <tr key={row.orderId}>
                    <td>{row.orderId.slice(0, 6)}</td>
                    <td>{row.vendorId}</td>
                    <td>{row.status}</td>
                    <td>R{row.total}</td>
                    <td>{row.date}</td>
                    <td>{row.itemCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}