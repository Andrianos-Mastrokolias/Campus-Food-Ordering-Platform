import LogoutButton from "../components/LogoutButton";
import { useCart } from "../context/CartContext";
import { useState, useEffect } from "react"; // useEffect fetches live menu items when the page loads
import { collection, getDocs } from "firebase/firestore"; // Firestore functions for reading menu items
import { db } from "../firebase"; // shared Firestore database connection
import { Link } from "react-router-dom";
import "./StudentHome.css";

export default function StudentHome() {
  const { cart, addToCart, clearCart, removeFromCart } = useCart();

  // Stores all menu items fetched from Firestore
  const [menuItems, setMenuItems] = useState([]);

  // Tracks whether menu data is still loading
  const [loading, setLoading] = useState(true);

  // Controls the temporary checkout success message
  const [orderPlaced, setOrderPlaced] = useState(false);

  // Fetch all menu items from Firestore when the student page loads
  // This links the student page to the same live menu data that vendors manage
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "menuItems"));

        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching student menu:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  // Calculate total cart price
  // Prices are stored like "R65.00", so remove "R" before converting to number
  const total = cart.reduce(
    (sum, item) => sum + Number(String(item.price).replace("R", "")),
    0
  );

  // Simulate checkout for now
  const handleCheckout = () => {
    if (cart.length === 0) return;

    setOrderPlaced(true);
    clearCart();

    setTimeout(() => {
      setOrderPlaced(false);
    }, 3000);
  };

  // Show loading message while Firestore data is being fetched
  if (loading) {
    return <p style={{ textAlign: "center", marginTop: "40px" }}>Loading menu...</p>;
  }

  return (
    <div className="student-home">
      <div className="welcome-section">
        <h1>Student Dashboard</h1>
        <p className="subtitle">Browse food items currently available on the platform.</p>
      </div>

      <div className="admin-apply-card">
        <h2>Apply for Admin Role</h2>
        <p>Help manage the platform by applying for admin privileges.</p>
        <Link to="/apply-admin" className="apply-btn">
          Apply Now
        </Link>
      </div>

      <section className="menu-section">
        <h2>🍔 Available Menu</h2>

        {menuItems.length === 0 ? (
          <p>No menu items available yet.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gap: "20px",
              maxWidth: "500px",
              margin: "0 auto",
            }}
          >
            {menuItems.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#fff",
                }}
              >
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    style={{
                      width: "45%",
                      height: "180px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      display: "block",
                      margin: "0 auto 16px",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "45%",
                      height: "180px",
                      borderRadius: "10px",
                      margin: "0 auto 16px",
                      background: "#f1f1f1",
                      color: "#666",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      border: "1px dashed #ccc",
                    }}
                  >
                    Image not available yet
                  </div>
                )}

                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <p>
                  <strong>{item.price}</strong>
                </p>

                <p style={{ fontWeight: "bold", color: item.available ? "green" : "red" }}>
                  {item.available ? "Available" : "Sold Out"}
                </p>

                <button
                  onClick={() => addToCart(item, item.vendorId)}
                  disabled={!item.available}
                  className="add-btn"
                >
                  {item.available ? "Add to Cart" : "Unavailable"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="cart-section">
        <h2>🛒 Your Cart</h2>

        {cart.length === 0 ? (
          <p className="empty-cart">No items in cart</p>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item, i) => (
                <div key={i} className="cart-item">
                  <div className="cart-item-details">
                    <span className="cart-item-name">{item.name}</span>
                    <span className="cart-item-vendor">({item.vendor})</span>
                  </div>
                  <div className="cart-item-actions">
                    <span className="cart-item-price">{item.price}</span>
                    <button
                      onClick={() => removeFromCart(i)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h3 className="cart-total">Total: R{total.toFixed(2)}</h3>
              <div className="cart-actions">
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="checkout-btn"
                >
                  Checkout
                </button>
                <button
                  onClick={clearCart}
                  disabled={cart.length === 0}
                  className="clear-btn"
                >
                  Clear Cart
                </button>
              </div>
            </div>

            {orderPlaced && (
              <div className="success-message">
                ✅ Your order has been placed successfully!
              </div>
            )}
          </>
        )}
      </section>

      <LogoutButton />
    </div>
  );
}