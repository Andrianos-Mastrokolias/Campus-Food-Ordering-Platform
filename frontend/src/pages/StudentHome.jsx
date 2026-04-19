import LogoutButton from "../components/LogoutButton";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react"; // useEffect fetches live menu items when the page loads
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore"; // Firestore functions for reading menu items
import { db } from "../firebase"; // shared Firestore database connection
import { Link } from "react-router-dom";
import "./StudentHome.css";
import { useNavigate } from "react-router-dom";   

export default function StudentHome() {
  const { cart, addToCart, clearCart, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  // Stores all menu items fetched from Firestore
  const [menuItems, setMenuItems] = useState([]);

  // Tracks whether menu data is still loading
  const [loading, setLoading] = useState(true);

  // Controls the temporary checkout success message
  const [orderPlaced, setOrderPlaced] = useState(false);

  

  console.log("orderPlaced state:", orderPlaced);
  console.log("RENDER orderPlaced =", orderPlaced);

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

 // Handles placing an order when student clicks "Checkout"
// This function writes orders to Firestore and then redirects user to tracking page

const handleCheckout = async () => {
  if (cart.length === 0) return;

  // Ensure user is logged in before allowing order placement
  if (!user) {
    alert("You must be logged in to place an order.");
    return;
  }

  try {
    // -----------------------------
    // STEP 1: GROUP ITEMS BY VENDOR
    // -----------------------------
    // Each vendor gets its own order document
    const ordersByVendor = {};

    cart.forEach((item) => {
      const vendorId = item.vendor;

      // If vendor doesn't exist in object yet, create it
      if (!ordersByVendor[vendorId]) {
        ordersByVendor[vendorId] = [];
      }

      // Push item into correct vendor group
      ordersByVendor[vendorId].push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      });
    });

    // -----------------------------------
    // STEP 2: WRITE ORDERS TO FIRESTORE
    // -----------------------------------
    for (const vendorId in ordersByVendor) {
      const vendorItems = ordersByVendor[vendorId];

      const orderTotal = vendorItems.reduce((sum, item) => {
        return sum + Number(String(item.price).replace("R", ""));
      }, 0);

      const orderData = {
        vendorId,                 // which vendor receives this order
        studentId: user.uid,      // who placed the order
        items: vendorItems,       // list of items
        total: orderTotal,        // total price
        status: "pending",       // initial order status
        createdAt: serverTimestamp(), // timestamp for sorting/tracking
      };

      // Save order in Firestore
      await addDoc(collection(db, "orders"), orderData);
    }

    // -----------------------------
    // STEP 3: CLEAN UP CART
    // -----------------------------
    clearCart();

    /*
  We show a success message instead of redirecting.
  This keeps the user on the menu so they can keep browsing.
*/
    setOrderPlaced(true);

    /*
      auto-hide message after a few seconds
      (so UI doesn’t stay cluttered forever)
    */
    setTimeout(() => {
      setOrderPlaced(false);
    }, 6000);

  } catch (error) {
    console.error("Error placing order:", error.message);
    alert("Something went wrong while placing your order.");
  }
};

  return (
    <div className="student-home">
      <div className="welcome-section">
        <h1>Student Dashboard</h1>
        <p className="subtitle">Browse food items currently available on the platform.</p>
      </div>

      {orderPlaced && (
        <div className="success-message">

          {/* Confirmation message after successful checkout */}
          <p>✅ Your order has been placed successfully!</p>

          {/* Next action (do NOT force redirect rather provide a link t
          so that they can view their order status and still browse) */}
          <div style={{ marginTop: "10px" }}>
            <Link to="/orders" className="track-btn">
              Track your order →
            </Link>
          </div>

        </div>
      )}

      <div className="admin-apply-card">
        <h2>Apply for Admin Role</h2>
        <p>Help manage the platform by applying for admin privileges.</p>
        <Link to="/apply-admin" className="apply-btn">
          Apply Now
        </Link>
      </div>

      <section className="menu-section">
        <h2>Menu</h2>

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
                <p><strong>Stock:</strong> {item.stock ?? 0}</p>

                <p style={{ fontWeight: "bold", color: (item.stock ?? 0) > 0 ? "green" : "red" }}>
                  {(item.stock ?? 0) > 0 ? "Available" : "Sold Out"}
                </p>

                <button
                  onClick={() => addToCart(item, item.vendorId)}
                  disabled={(item.stock ?? 0) === 0}
                  className="add-btn"
                >
                  {(item.stock ?? 0) > 0 ? "Add to Cart" : "Unavailable"}
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
                <div style={{
                  position: "fixed",
                  top: "20px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "green",
                  color: "white",
                  padding: "20px",
                  zIndex: 99999,
                  fontSize: "20px"
                }}>
                  ORDER SUCCESS TEST 🔥
                </div>
              )}
          </>
        )}
      </section>

      

      

      <LogoutButton />
    </div>
  );
}