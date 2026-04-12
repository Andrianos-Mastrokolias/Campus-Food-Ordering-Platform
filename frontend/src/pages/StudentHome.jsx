import LogoutButton from "../components/LogoutButton";
import { menuData } from "../data/menuData";
import { useCart } from "../context/CartContext";
import { useState } from "react";

export default function StudentHome() {
  const { cart, addToCart, clearCart, removeFromCart } = useCart();

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const handleCheckout = () => {
  if (cart.length === 0) return;

  setOrderPlaced(true);
  clearCart();

  setTimeout(() => {
    setOrderPlaced(false);
  }, 3000);
};



  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>

      {/* KEEP EXISTING HEADER */}
      <h1>Student Dashboard</h1>
      <p>Welcome! You are logged in as a student.</p>
      <p>Food browsing and ordering features will appear here.</p>

      <hr />

      {/* NEW: MENU SECTION */}
      <h2>🍔 Menu</h2>

      {menuData.map((vendor, index) => (
        <div key={index} style={{ marginBottom: "20px" }}>
          <h3>{vendor.vendor}</h3>

          {vendor.items.map((item) => (
            <div key={item.id}>
              <p>
                {item.name} - R{item.price}
              </p>

              <button onClick={() => addToCart(item, vendor.vendor)}>
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      ))}

      <hr />

      {/* NEW: CART SECTION */}
      <h2>🛒 Your Cart</h2>

      {cart.length === 0 ? (
        <p>No items in cart</p>
      ) : (
        cart.map((item, i) => (
  <div key={i} style={{ marginBottom: "10px" }}>
    <span>
      {item.name} ({item.vendor}) - R{item.price}
    </span>

    <button
      onClick={() => removeFromCart(i)}
      style={{ marginLeft: "10px" }}
    >
      Remove
    </button>
  </div>
))
      )}

      <h3>Total: R{total}</h3>

      <button onClick={handleCheckout} disabled={cart.length === 0}>
  Checkout
</button>

{orderPlaced && (
  <h3 style={{ color: "green" }}>
    ✅ Your order has been placed successfully!
  </h3>
)}

      <button onClick={clearCart} disabled={cart.length === 0}>
        Clear Cart
      </button>

      <hr />

      {/* KEEP LOGOUT */}
      <LogoutButton />
    </div>
  );
}