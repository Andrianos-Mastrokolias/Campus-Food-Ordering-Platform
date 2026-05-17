import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/* -------------------------------------------------- */
/* FIREBASE, AUTH, EXPORTS, AND STYLING IMPORTS       */
/* -------------------------------------------------- */
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportCSV";
import { exportToPDF } from "../utils/exportPDF";
import "./AnalyticsDashboard.css";

/* -------------------------------------------------- */
/* VENDOR ANALYTICS DASHBOARD                 */
/* Displays sales over time, peak ordering hours,     */
/* custom filtered reports, and export functionality  */
/* -------------------------------------------------- */
export default function AnalyticsDashboard() {

  /* Logged-in user, role, and authentication loading state */
  const { user, role, loading } = useAuth();

  /* Stores orders fetched from Firestore */
  const [orders, setOrders] = useState([]);

  /* Tracks whether analytics data is still being fetched */
  const [fetching, setFetching] = useState(true);

  /* Custom report filter states */
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  /* -------------------------------------------------- */
  /* FETCH ORDERS FROM FIRESTORE                        */
  /* Vendors only fetch their own orders.               */                      
  /* -------------------------------------------------- */
  useEffect(() => {
    const fetchOrders = async () => {
      if (loading || !user) return;

      try {
        setFetching(true);

        const ordersRef = collection(db, "orders");

        const q =
          role === "vendor"
            ? query(ordersRef, where("vendorId", "==", user.uid))
            : query(ordersRef);

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setOrders(data);
      } catch (error) {
        console.error("Error fetching analytics orders:", error.message);
      } finally {
        setFetching(false);
      }
    };

    fetchOrders();
  }, [user, role, loading]);

  /* Converts Firestore timestamp into YYYY-MM-DD format */
  const formatDate = (createdAt) => {
    if (!createdAt?.toDate) return "Unknown";
    return createdAt.toDate().toISOString().split("T")[0];
  };

  /* Converts Firestore timestamp into hour format, e.g. 13:00 */
  const formatHour = (createdAt) => {
    if (!createdAt?.toDate) return "Unknown";
    const hour = createdAt.toDate().getHours();
    return `${String(hour).padStart(2, "0")}:00`;
  };

  /* Safely gets the total value from an order */
  const getOrderTotal = (order) => {
    return Number(order.total ?? order.totalAmount ?? 0);
  };

  /* -------------------------------------------------- */
  /* FILTER ORDERS FOR CUSTOM REPORT VIEW              */
  /* Applies start date, end date, and status filters.  */
  /* -------------------------------------------------- */
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = order.createdAt?.toDate
        ? order.createdAt.toDate()
        : null;

      if (startDate && orderDate && orderDate < new Date(startDate)) {
        return false;
      }

      if (endDate && orderDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (orderDate > end) return false;
      }

      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [orders, startDate, endDate, statusFilter]);

  /* -------------------------------------------------- */
  /* SALES OVER TIME REPORT DATA                       */
  /* Groups total sales by order date.                  */
  /* -------------------------------------------------- */
  const salesOverTime = useMemo(() => {
    const grouped = {};

    filteredOrders.forEach((order) => {
      const date = formatDate(order.createdAt);

      if (!grouped[date]) {
        grouped[date] = {
          date,
          sales: 0,
        };
      }

      grouped[date].sales += getOrderTotal(order);
    });

    return Object.values(grouped).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [filteredOrders]);

  /* -------------------------------------------------- */
  /* PEAK ORDERING HOURS REPORT DATA                   */
  /* Groups number of orders by the hour placed.        */
  /* -------------------------------------------------- */
  const peakOrderingHours = useMemo(() => {
    const grouped = {};

    filteredOrders.forEach((order) => {
      const hour = formatHour(order.createdAt);

      if (!grouped[hour]) {
        grouped[hour] = {
          hour,
          orders: 0,
        };
      }

      grouped[hour].orders += 1;
    });

    return Object.values(grouped).sort((a, b) =>
      a.hour.localeCompare(b.hour)
    );
  }, [filteredOrders]);

  /* -------------------------------------------------- */
  /* CUSTOM REPORT TABLE DATA                          */
  /* Formats filtered orders into table/export rows.    */
  /* -------------------------------------------------- */
  const customReportRows = useMemo(() => {
    return filteredOrders.map((order) => ({
      orderId: order.id,
      vendorId: order.vendorId || "",
      studentId: order.studentId || "",
      status: order.status || "",
      total: getOrderTotal(order).toFixed(2),
      date: order.createdAt?.toDate
        ? order.createdAt.toDate().toLocaleString()
        : "Unknown",
      itemCount: order.items?.length || 0,
    }));
  }, [filteredOrders]);

  /* Summary card: total sales */
  const totalSales = filteredOrders.reduce(
    (sum, order) => sum + getOrderTotal(order),
    0
  );

  /* Summary card: total number of orders */
  const totalOrders = filteredOrders.length;

  /* Summary card: average order value */
  const averageOrderValue =
    totalOrders > 0 ? totalSales / totalOrders : 0;

  /* Summary card: busiest ordering hour */
  const busiestHour =
    peakOrderingHours.length > 0
      ? peakOrderingHours.reduce((max, current) =>
          current.orders > max.orders ? current : max
        ).hour
      : "N/A";

  /* Show loading message while auth or Firestore data is still loading */
  if (loading || fetching) {
    return <p className="analytics-loading">Loading analytics...</p>;
  }

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1>Vendor Analytics Dashboard</h1>
        <p>View sales trends, peak ordering hours, and custom reports.</p>
      </header>

      <section className="analytics-summary">
        <div className="summary-card">
          <h3>Total Sales</h3>
          <p>R{totalSales.toFixed(2)}</p>
        </div>

        <div className="summary-card">
          <h3>Total Orders</h3>
          <p>{totalOrders}</p>
        </div>

        <div className="summary-card">
          <h3>Average Order</h3>
          <p>R{averageOrderValue.toFixed(2)}</p>
        </div>

        <div className="summary-card">
          <h3>Peak Hour</h3>
          <p>{busiestHour}</p>
        </div>
      </section>

      <section className="analytics-filters">
        <h2>Custom View Filters</h2>

        <div className="filter-row">
          <label>
            Start Date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          <label>
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
      </section>

      <section className="analytics-card">
        <div className="report-header">
          <h2>Sales Over Time</h2>

          <div>
            <button
              onClick={() => exportToCSV("sales-over-time", salesOverTime)}
            >
              Export CSV
            </button>

            <button
              onClick={() => exportToPDF("Sales Over Time", salesOverTime)}
            >
              Export PDF
            </button>
          </div>
        </div>

        {salesOverTime.length === 0 ? (
          <p>No sales data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="analytics-card">
        <div className="report-header">
          <h2>Peak Ordering Hours</h2>

          <div>
            <button
              onClick={() =>
                exportToCSV("peak-ordering-hours", peakOrderingHours)
              }
            >
              Export CSV
            </button>

            <button
              onClick={() =>
                exportToPDF("Peak Ordering Hours", peakOrderingHours)
              }
            >
              Export PDF
            </button>
          </div>
        </div>

        {peakOrderingHours.length === 0 ? (
          <p>No ordering hour data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={peakOrderingHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" barSize={60} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="analytics-card">
        <div className="report-header">
          <h2>Custom Report</h2>

          <div>
            <button
              onClick={() =>
                exportToCSV("custom-order-report", customReportRows)
              }
            >
              Export CSV
            </button>

            <button
              onClick={() =>
                exportToPDF("Custom Order Report", customReportRows)
              }
            >
              Export PDF
            </button>
          </div>
        </div>

        {customReportRows.length === 0 ? (
          <p>No orders match your filters.</p>
        ) : (
          <div className="table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Vendor ID</th>
                  <th>Student ID</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th>Items</th>
                </tr>
              </thead>

              <tbody>
                {customReportRows.map((row) => (
                  <tr key={row.orderId}>
                    <td>{row.orderId.slice(0, 6)}</td>
                    <td>{row.vendorId}</td>
                    <td>{row.studentId}</td>
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