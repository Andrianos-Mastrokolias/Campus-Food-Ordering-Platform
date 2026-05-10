import LogoutButton from "../components/LogoutButton";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react"; // useEffect fetches live menu items when the page loads
// ------------------------------------------------------
// Firestore imports
// ------------------------------------------------------
// collection       -> reference Firestore collections
// getDocs          -> fetch menu items
// addDoc           -> create new order documents
// serverTimestamp  -> store accurate server-side timestamps
// query/where      -> filter orders for logged-in student
// onSnapshot       -> realtime Firestore listener
// ------------------------------------------------------
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  Timestamp
} from "firebase/firestore";

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

  // Stores menu items grouped by vendor so the student page is easier to browse
  const [vendorsWithItems, setVendorsWithItems] = useState([]);

  // Tracks whether menu data is still loading
  const [loading, setLoading] = useState(true);

  // Controls the temporary checkout success message
  const [orderPlaced, setOrderPlaced] = useState(false);
  // ------------------------------------------------------
// TRACK ORDERS THAT ALREADY SHOWED NOTIFICATIONS
// ------------------------------------------------------
// Prevents duplicate popup notifications from appearing
// repeatedly while Firestore listener continues running.
// ------------------------------------------------------
const [notifiedOrders, setNotifiedOrders] = useState([]);

// ------------------------------------------------------
// CURRENT LIVE ORDER NOTIFICATION MESSAGE
// ------------------------------------------------------
// Stores the popup text shown when an order becomes ready.
// null = no popup currently visible.
// ------------------------------------------------------
const [readyNotification, setReadyNotification] = useState(null);

// Generates a daily order number such as #001, #002, etc.
// The count resets every new day.
const generateDailyOrderNumber = async () => {
  // Start of today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // End of today
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Query all orders created today
  const ordersQuery = query(
    collection(db, "orders"),
    where("createdAt", ">=", Timestamp.fromDate(today)),
    where("createdAt", "<", Timestamp.fromDate(tomorrow))
  );

  const snapshot = await getDocs(ordersQuery);

  // Next order number for today
  const nextOrderNumber = snapshot.docs.length + 1;

  // Format like #001
  return `#${String(nextOrderNumber).padStart(3, "0")}`;
};

  

  console.log("orderPlaced state:", orderPlaced);
  console.log("RENDER orderPlaced =", orderPlaced);

  // Fetch all menu items from Firestore when the student page loads
  // This links the student page to the same live menu data that vendors manage
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "menuItems"));

        const items = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        
        setMenuItems(items);
        
        // Group menu items by vendorId
        const groupedItems = {};
        
        items.forEach((item) => {
          const vendorId = item.vendorId || "unknown-vendor";
        
          if (!groupedItems[vendorId]) {
            groupedItems[vendorId] = {
              vendorId,
              vendorName: item.vendorName || "Unknown Vendor",
              vendorDescription: "",
              items: [],
            };
          }
        
          groupedItems[vendorId].items.push(item);
        });
        
        // Fetch vendor profile details for each vendor group
        const vendorGroups = await Promise.all(
          Object.values(groupedItems).map(async (group) => {
            try {
              const vendorRef = doc(db, "users", group.vendorId);
              const vendorSnap = await getDoc(vendorRef);
        
              if (vendorSnap.exists()) {
                const vendorData = vendorSnap.data();
        
                return {
                  ...group,
                  vendorName:
                    vendorData.vendorProfile?.businessName || group.vendorName,
                  vendorDescription:
                    vendorData.vendorProfile?.businessDescription || "",
                };
              }
        
              return group;
            } catch (error) {
              console.error("Error fetching vendor profile:", error.message);
              return group;
            }
          })
        );
        
        setVendorsWithItems(vendorGroups);
      } catch (error) {
        console.error("Error fetching student menu:", error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  // ------------------------------------------------------
// REALTIME ORDER STATUS LISTENER
// ------------------------------------------------------
// This listener continuously watches the logged-in
// student's orders inside Firestore.
//
// Whenever a vendor updates an order status to "ready",
// the student immediately receives an in-app popup
// notification without refreshing the page.
//
// Supports User Story 2:
// "As a student, I want to receive an in-app
// notification when my order is ready."
// ------------------------------------------------------
useEffect(() => {

  // Stop execution if user is not logged in yet
  if (!user) return;

  // Reference Firestore orders collection
  const ordersRef = collection(db, "orders");

  // Query only orders belonging to current student
  const ordersQuery = query(
    ordersRef,
    where("studentId", "==", user.uid)
  );

  // ------------------------------------------------------
  // Create realtime Firestore listener
  // ------------------------------------------------------
  // onSnapshot automatically triggers whenever matching
  // Firestore documents are added or updated.
  // ------------------------------------------------------
  const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {

    snapshot.docs.forEach((doc) => {

      // Convert Firestore document into usable object
      const order = {
        id: doc.id,
        ...doc.data()
      };

      // Check whether this order already triggered
      // a popup notification previously
      const alreadyNotified = notifiedOrders.includes(order.id);

      // ------------------------------------------------------
      // SHOW POPUP WHEN ORDER STATUS BECOMES "READY"
      // ------------------------------------------------------
      if (
        order.status === "ready" &&
        !alreadyNotified
      ) {

        // Display realtime popup notification
        setReadyNotification(
          `✅ Order #${order.id.slice(0, 6)} is ready for collection!`
        );

        // Store order ID to prevent duplicate popups
        setNotifiedOrders((previousOrders) => [
          ...previousOrders,
          order.id
        ]);

        // Automatically hide popup after 5 seconds
        setTimeout(() => {
          setReadyNotification(null);
        }, 5000);
      }
    });
  });

  // ------------------------------------------------------
  // Cleanup realtime listener
  // ------------------------------------------------------
  // Prevents memory leaks and duplicate listeners when
  // component rerenders or unmounts.
  // ------------------------------------------------------
  return () => unsubscribe();

}, [user, notifiedOrders]);

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
      const vendorId = item.vendor?.id || item.vendor;

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

      // Generate readable daily order number such as #001, #002, etc.
      const dailyOrderNumber = await generateDailyOrderNumber();

      const orderData = {
        vendorId,                 // which vendor receives this order
        vendorName: cart.find((item) => (item.vendor?.id || item.vendor) === vendorId)?.vendor?.name || "Unknown Vendor",
        studentId: user.uid,      // who placed the order
        studentEmail: user.email, // store email for easy reference
        items: vendorItems,       // list of items
        total: orderTotal,        // total price
        status: "pending",       // initial order status
        dailyOrderNumber,         // readable order number for vendor dashboard
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
      {/* ------------------------------------------------------ */}
      {/* LIVE ORDER READY NOTIFICATION POPUP                  */}
      {/* ------------------------------------------------------ */}
      {/* This popup appears instantly when a vendor updates   */}
      {/* the student's order status to "ready".               */}
      {/* ------------------------------------------------------ */}
      {readyNotification && (
        <div className="ready-popup">
          {readyNotification}
        </div>
      )}
      <div className="welcome-section">
        <h1>Student Dashboard</h1>
        <p className="subtitle">Browse food items currently available on the platform.</p>

        <div className="analytics-btn-container">
          <Link to="/student/analytics">
            <button type="button" className="analytics-dashboard-btn">
              📊 View My Analytics
            </button>
          </Link>
        </div>
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
        <h2>Menu by Vendor</h2>

        {vendorsWithItems.length === 0 ? (
          <p>No menu items available yet.</p>
        ) : (
          <div className="vendor-menu-list">
            {vendorsWithItems.map((vendor) => (
              <div key={vendor.vendorId} className="vendor-menu-section">
                <div className="vendor-menu-header">
                  <h3>{vendor.vendorName}</h3>
                  {vendor.vendorDescription && <p>{vendor.vendorDescription}</p>}
                </div>

                <div className="student-menu-grid">
                  {vendor.items.map((item) => (
                    <div key={item.id} className="student-menu-card">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.name}
                          className="student-menu-image"
                        />
                      ) : (
                        <div className="student-menu-placeholder">
                          Image not available yet
                        </div>
                      )}

                      <h4>{item.name}</h4>
                      <p>{item.description}</p>
                      <p>
                        <strong>{item.price}</strong>
                      </p>

                      <p className={(item.stock ?? 0) > 0 ? "student-available" : "student-sold-out"}>
                        {(item.stock ?? 0) > 0 ? "Available" : "Sold Out"}
                      </p>

                      <button
                        onClick={() =>
                          addToCart(item, {
                            id: item.vendorId,
                            name: vendor.vendorName,
                          })
                        }
                        disabled={(item.stock ?? 0) === 0}
                        className="add-btn"
                      >
                        {(item.stock ?? 0) > 0 ? "Add to Cart" : "Unavailable"}
                      </button>
                    </div>
                  ))}
                </div>
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
                    <span className="cart-item-vendor">({item.vendor?.name || item.vendor})</span>
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

              
          </>
        )}
      </section>

      

      

      <LogoutButton />
    </div>
  );
}