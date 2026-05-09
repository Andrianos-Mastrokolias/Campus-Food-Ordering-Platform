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
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { exportToCSV } from "../utils/exportCSV";
import { exportToPDF } from "../utils/exportPDF";
import "./AnalyticsDashboard.css";

export default function AnalyticsDashboard() {
  const { user, role, loading } = useAuth();

  const [orders, setOrders] = useState([]);

  // Tracks whether analytics data is still being fetched
  const [fetching, setFetching] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const formatDate = (createdAt) => {
    if (!createdAt?.toDate) return "Unknown";
    return createdAt.toDate().toISOString().split("T")[0];
  };

  const formatHour = (createdAt) => {
    if (!createdAt?.toDate) return "Unknown";
    const hour = createdAt.toDate().getHours();
    return `${String(hour).padStart(2, "0")}:00`;
  };

  const getOrderTotal = (order) => {
    return Number(order.total ?? order.totalAmount ?? 0);
  };

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

  const totalSales = filteredOrders.reduce(
    (sum, order) => sum + getOrderTotal(order),
    0
  );

  const totalOrders = filteredOrders.length;

  const averageOrderValue =
    totalOrders > 0 ? totalSales / totalOrders : 0;

  const busiestHour =
    peakOrderingHours.length > 0
      ? peakOrderingHours.reduce((max, current) =>
          current.orders > max.orders ? current : max
        ).hour
      : "N/A";

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
              <Bar dataKey="orders" />
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