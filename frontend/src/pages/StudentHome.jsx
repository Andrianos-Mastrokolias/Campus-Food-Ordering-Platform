import LogoutButton from "../components/LogoutButton";
import { useCart } from "../context/CartContext";
import { useState, useEffect } from "react"; //useEffect lets us fetch menu data when the page loads
import { collection, getDocs } from "firebase/firestore"; //used to fetch menu items from the database
import { db } from "../firebase"; //db is the shared firestore database connection

export default function StudentHome() {
  const { cart, addToCart, clearCart, removeFromCart } = useCart();

  //stores all menu items fetched from Firestore
  const [menuItems, setMenuItems] = useState([]);

  //tracks whether the menu is still loading
  const [loading, setLoading] = useState(true);

  const [orderPlaced, setOrderPlaced] = useState(false);

  //fetch all menu items from Firestore when the student page loads
  //this links the student page to the same data the vendor manages
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        //get every document from the menuItems collection
        const querySnapshot = await getDocs(collection(db, "menuItems"));

        //convert Firestore documents into normal JavaScript objects
        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        //save the fetched menu items into state
        setMenuItems(items);
      } catch (error) {
        //log an error if the fetch fails
        console.error("Error fetching student menu:", error.message);
      } finally {
        //stop loading whether the fetch succeeds or fails
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  //calculate the total cart price
  //prices are stored like "R52.00", so we remove the "R" before converting to a number
  const total = cart.reduce(
    (sum, item) => sum + Number(String(item.price).replace("R", "")),
    0
  );

  const handleCheckout = () => {
  if (cart.length === 0) return;

  setOrderPlaced(true);
  clearCart();

  setTimeout(() => {
    setOrderPlaced(false);
  }, 3000);
};

//while Firestore data is loading, show a loading message
if (loading) {
  return <p style={{ textAlign: "center", marginTop: "40px" }}>Loading menu...</p>;
}


  return (
    <div style={{ textAlign: "center", marginTop: "40px", padding: "20px" }}>

      {/* KEEP EXISTING HEADER */}
      <h1>Student Dashboard</h1>
      <p>Welcome! You are logged in as a student.</p>
      <p>Browse food items currently available on the platform.</p>

      <hr />

      {/* NEW: MENU SECTION */}
      <h2>Menu</h2>

      {/* If there are no menu items in Firestore, show a message */}
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
          {/* Loop through every menu item fetched from Firestore */}
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
              {/* Show the item image if a photo URL exists.
                  Otherwise show a placeholder box. */}
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
                    width: "60%",
                    height: "250px",
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

              {/* Show the item details */}
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <p>
                <strong>{item.price}</strong>
              </p>

              {/* Show whether the item is available or sold out */}
              <p style={{ fontWeight: "bold", color: item.available ? "green" : "red" }}>
                {item.available ? "Available" : "Sold Out"}
              </p>

              {/* Students can only add available items to cart.
                  Sold out items are still visible but cannot be added. */}
              <button
                onClick={() => addToCart(item, item.vendorId)}
                disabled={!item.available}
              >
                {item.available ? "Add to Cart" : "Unavailable"}
              </button>
            </div>
          ))}
        </div>
      )}

      <hr />

      {/* Cart section */}
      <h2>Your Cart</h2>

      {/* Show either an empty-cart message or the current cart contents */}
      {cart.length === 0 ? (
        <p>No items in cart</p>
      ) : (
        cart.map((item, i) => (
          <div key={i} style={{ marginBottom: "10px" }}>
            <span>
              {item.name} ({item.vendor}) - {item.price}
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

      {/* Cart total */}
      <h3>Total: R{total.toFixed(2)}</h3>

      {/* Checkout button */}
      <button onClick={handleCheckout} disabled={cart.length === 0}>
        Checkout
      </button>

      {/* Temporary checkout success message */}
      {orderPlaced && (
        <h3 style={{ color: "green" }}>
          Your order has been placed successfully!
        </h3>
      )}

      {/* Clear cart button */}
      <button onClick={clearCart} disabled={cart.length === 0} style={{ marginLeft: "10px" }}>
        Clear Cart
      </button>

      <hr />

      {/* Logout button */}
      <LogoutButton />
    </div>
  );
}