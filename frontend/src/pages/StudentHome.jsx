import { menuData } from "../data/menuData";
import { useCart } from "../context/CartContext";
import { useState } from "react";
import { Link } from "react-router-dom";
import './StudentHome.css';

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
    <div className="student-home">
      <div className="welcome-section">
        <h1>Welcome to Campus Food Ordering Platform</h1>
        <p className="subtitle">Browse menus, place orders, and enjoy delicious food!</p>
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
        <div className="vendors-grid">
          {menuData.map((vendor, index) => (
            <div key={index} className="vendor-card">
              <h3 className="vendor-name">{vendor.vendor}</h3>
              <div className="menu-items">
                {vendor.items.map((item) => (
                  <div key={item.id} className="menu-item">
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-price">R{item.price}</span>
                    </div>
                    <button 
                      onClick={() => addToCart(item, vendor.vendor)}
                      className="add-btn"
                    >
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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
                    <span className="cart-item-price">R{item.price}</span>
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
              <h3 className="cart-total">Total: R{total}</h3>
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
    </div>
  );
}
