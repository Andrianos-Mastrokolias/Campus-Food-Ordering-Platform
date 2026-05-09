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
  const { user, loading } = useAuth();

  const [orders, setOrders] = useState([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchStudentOrders = async () => {
      if (loading) return;

      if (!user) {
          setFetching(false);
          return;
      }

      try {
        setFetching(true);

        const ordersRef = collection(db, "orders");

        const q = query(
          ordersRef,
          where("studentId", "==", user.uid)
        );

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setOrders(data);
      } catch (error) {
        console.error("Error fetching student analytics:", error.message);
      } finally {
        setFetching(false);
      }
    };

    fetchStudentOrders();
  }, [user, loading]);

  const getOrderTotal = (order) => {
    return Number(order.total ?? order.totalAmount ?? 0);
  };

  const totalSpent = orders.reduce(
    (sum, order) => sum + getOrderTotal(order),
    0
  );

  const totalOrders = orders.length;

  const averageSpend =
    totalOrders > 0 ? totalSpent / totalOrders : 0;

  const spendingByDate = useMemo(() => {
    const grouped = {};

    orders.forEach((order) => {
      const date = order.createdAt?.toDate
        ? order.createdAt.toDate().toISOString().split("T")[0]
        : "Unknown";

      if (!grouped[date]) {
        grouped[date] = {
          date,
          spent: 0,
        };
      }

      grouped[date].spent += getOrderTotal(order);
    });

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
    return <p className="student-analytics-loading">Loading student analytics...</p>;
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