import LogoutButton from "../components/LogoutButton";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import paymentService from '../services/paymentService';
import { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import "./StudentHome.css";
//US3 Standardised dietary/allergen options used to display menu item labels consistently
// for the Sprint 4 SA Data Integration requirement.
import {
  ALLERGEN_OPTIONS,
  DIETARY_TAG_OPTIONS,
  DIETARY_SOURCE_INFO,
} from "../data/dietaryAllergenData";
/**
 * StudentHome — US3 update
 *
 * The old "Checkout" button that created unpaid orders has been removed.
 * Orders are now ONLY created after successful payment (in PaymentPage.jsx
 * via paymentService.createOrderAfterPayment).
 *
 * The "Pay Now" button is the only way to place an order.
 */
export default function StudentHome() {
  const { cart, addToCart, clearCart, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [, setMenuItems]       = useState([]);
  const [vendorsWithItems, setVendorsWithItems] = useState([]);
  const [, setLoading]         = useState(true);
  const [notifiedOrders, setNotifiedOrders]     = useState([]);
  const [readyNotification, setReadyNotification] = useState(null);

  //SA Data Integration filters.
  // Students can filter for dietary preferences and hide items containing selected allergens.
  const [selectedDietaryFilter, setSelectedDietaryFilter] = useState("");
  const [excludedAllergens, setExcludedAllergens] = useState([]);

  // Fetch menu items grouped by vendor
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "menuItems"));
        const items = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setMenuItems(items);

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

        const vendorGroups = await Promise.all(
          Object.values(groupedItems).map(async (group) => {
            try {
              const vendorRef  = doc(db, "users", group.vendorId);
              const vendorSnap = await getDoc(vendorRef);
              if (vendorSnap.exists()) {
                const vendorData = vendorSnap.data();
                return {
                  ...group,
                  vendorName:        vendorData.vendorProfile?.businessName || group.vendorName,
                  vendorDescription: vendorData.vendorProfile?.businessDescription || "",
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

  // Realtime listener — popup when order is ready
  useEffect(() => {
  if (!user) return;

  const ordersQuery = query(
    collection(db, "orders"),
    where("studentId", "==", user.uid)
  );

  const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const order = { id: change.doc.id, ...change.doc.data() };

      // ONLY trigger when status JUST changed to "ready"
      if (
        change.type === "modified" &&
        order.status === "ready"
      ) {
        setReadyNotification(
          `✅ Order #${order.orderId || order.id.slice(0, 6)} is ready for collection!`
        );

        setTimeout(() => setReadyNotification(null), 5000);
      }
    });
  });

  return () => unsubscribe();
}, [user]);

  const total = cart.reduce(
    (sum, item) => sum + Number(String(item.price).replace("R", "")),
    0
  );

  /**
   * US3: Pay Now — the ONLY way to place an order.
   * Creates a payment record, then PaymentPage creates the order after
   * payment is confirmed.
   */
  const handlePayNow = async () => {
    if (!user) { navigate('/login'); return; }
    if (cart.length === 0) return;
    try {
      const orderId   = paymentService.generateOrderId();
      const amount    = total + 5.00;
      const paymentId = await paymentService.createPayment({
        userId:    user.uid,
        userEmail: user.email,
        userName:  user.displayName || '',
        orderId,
        amount,
        method:    'upi',
        items:     cart.map(item => ({
          name:      item.name,
          qty:       1,
          price:     Number(String(item.price).replace('R', '')),
          vendorId:  item.vendor?.id || item.vendorId,
          vendorName: item.vendor?.name || item.vendorName || 'Unknown Vendor',
          vendor:    item.vendor,
        })),
      });
      navigate('/payment', {
        state: {
          paymentId,
          orderId,
          amount,
          method: 'upi',
          items:  cart,
          showMethodSelector: true,
        }
      });
    } catch (err) {
      console.error(err);
      alert('Could not initiate payment. Please try again.');
    }
  };

  //US3 Converts stored dietary tag IDs from Firestore into readable labels for students.
  // Example: "halal" becomes "Halal".
  const getDietaryLabel = (tagId) => {
    return DIETARY_TAG_OPTIONS.find((option) => option.id === tagId)?.label || tagId;
  };

  //US3 Converts stored allergen IDs from Firestore into readable labels for students.
  // Example: "cow_milk" becomes "Cow's Milk".
  const getAllergenLabel = (allergenId) => {
    return ALLERGEN_OPTIONS.find((option) => option.id === allergenId)?.label || allergenId;
  };

  //US3 Adds or removes allergens from the exclusion filter.
  const handleAllergenFilterChange = (allergenId) => {
    setExcludedAllergens((previousAllergens) =>
      previousAllergens.includes(allergenId)
        ? previousAllergens.filter((id) => id !== allergenId)
        : [...previousAllergens, allergenId]
    );
  };

  //US3 Applies the selected dietary filter and allergen exclusions to each vendor's menu.
  // A vendor is only shown if at least one of their items matches the filters.
  const filteredVendorsWithItems = vendorsWithItems
  .map((vendor) => {
    const filteredItems = vendor.items.filter((item) => {
      const itemDietaryTags = item.dietaryTags || [];
      const itemAllergens = item.allergens || [];

      const matchesDietaryFilter =
        selectedDietaryFilter === "" ||
        itemDietaryTags.includes(selectedDietaryFilter);

      const containsExcludedAllergen = excludedAllergens.some((allergenId) =>
        itemAllergens.includes(allergenId)
      );

      return matchesDietaryFilter && !containsExcludedAllergen;
    });

    return {
      ...vendor,
      items: filteredItems,
    };
  })
  .filter((vendor) => vendor.items.length > 0);

  return (
    <div className="student-home">

      {/* Order ready popup */}
      {readyNotification && (
        <div className="ready-popup">{readyNotification}</div>
      )}

      {/* Welcome section */}
      <div className="welcome-section">
        <h1>Student Dashboard</h1>
        <p className="subtitle">Browse food items currently available on the platform.</p>

        <div className="analytics-btn-container">
          <Link to="/student/analytics">
            <button type="button" className="analytics-dashboard-btn">
              📊 View My Analytics
            </button>
          </Link>
          <Link to="/payment-history">
            <button type="button" className="analytics-dashboard-btn">
              💳 Payment History
            </button>
          </Link>
          {/* -------------------------------------------------- */
              /* SUPPORT PAGE BUTTON */
             /* Takes students to the support/help page */
            /* -------------------------------------------------- */}

          <Link to="/support">
            <button type="button" className="analytics-dashboard-btn">
              📩 Support & Order Policy
            </button>
          </Link>

        </div>
      </div>

      {/* Apply for admin card */}
      <div className="admin-apply-card">
        <h2>Apply for Admin Role</h2>
        <p>Help manage the platform by applying for admin privileges.</p>
        <Link to="/apply-admin" className="apply-btn">Apply Now</Link>
      </div>

      {/* Menu section */}
      <section className="menu-section">
        <h2>Menu by Vendor</h2>

        {/* US3 SA Data Integration:
            Students can filter items using the standardised dietary and allergen dataset. */}
        <div className="student-filter-panel">
          <div className="filter-group">
            <label htmlFor="dietary-filter">Dietary preference</label>
            <select
              id="dietary-filter"
              value={selectedDietaryFilter}
              onChange={(event) => setSelectedDietaryFilter(event.target.value)}
            >
              <option value="">Show all dietary options</option>
              {DIETARY_TAG_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <p>Exclude allergens</p>

            <div className="checkbox-options-grid">
              {ALLERGEN_OPTIONS.map((option) => (
                <label key={option.id} className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={excludedAllergens.includes(option.id)}
                    onChange={() => handleAllergenFilterChange(option.id)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {(selectedDietaryFilter || excludedAllergens.length > 0) && (
            <button
              type="button"
              className="clear-filter-btn"
              onClick={() => {
                setSelectedDietaryFilter("");
                setExcludedAllergens([]);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* US3 SA Data Integration:
            Shows students where the dietary/allergen labels come from. */}
        <div className="dietary-source-note">
          <strong>{DIETARY_SOURCE_INFO.title}</strong>
          <p>{DIETARY_SOURCE_INFO.description}</p>
        </div>

        {vendorsWithItems.length === 0 ? (
          <p>No menu items available yet.</p>
        ) : filteredVendorsWithItems.length === 0 ? (
          <p>No menu items match your selected dietary/allergen filters.</p>
        ) : (
          <div className="vendor-menu-list">
            {filteredVendorsWithItems.map((vendor) => (
              <div key={vendor.vendorId} className="vendor-menu-section">
                <div className="vendor-menu-header">
                  <h3>{vendor.vendorName}</h3>
                  {vendor.vendorDescription && <p>{vendor.vendorDescription}</p>}
                </div>
                <div className="student-menu-grid">
                  {vendor.items.map((item) => (
                    <div key={item.id} className="student-menu-card">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt={item.name} className="student-menu-image" />
                      ) : (
                        <div className="student-menu-placeholder">Image not available yet</div>
                      )}
                      <h4>{item.name}</h4>
                        <p>{item.description}</p>
                        <p><strong>{item.price}</strong></p>

                        {/*US3 Data Integration:
                            Display standardised dietary and allergen information so students can make safer food choices. */}
                        {item.dietaryTags?.length > 0 && (
                          <div className="tag-section">
                            <strong>Dietary:</strong>
                            <div className="tag-row">
                              {item.dietaryTags.map((tagId) => (
                                <span key={tagId} className="dietary-tag">
                                  {getDietaryLabel(tagId)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.allergens?.length > 0 && (
                          <div className="tag-section">
                            <strong>Allergens:</strong>
                            <div className="tag-row">
                              {item.allergens.map((allergenId) => (
                                <span key={allergenId} className="allergen-tag">
                                  {getAllergenLabel(allergenId)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className={(item.stock ?? 0) > 0 ? "student-available" : "student-sold-out"}>
                        {(item.stock ?? 0) > 0 ? "Available" : "Sold Out"}
                      </p>
                      <button
                        onClick={() => addToCart(item, { id: item.vendorId, name: vendor.vendorName })}
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

      {/* Cart section */}
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
                    <button onClick={() => removeFromCart(i)} className="remove-btn">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <h3 className="cart-total">Total: R{total.toFixed(2)}</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                + R5.00 service fee applied at checkout
              </p>
              <div className="cart-actions">
                <button
                  onClick={handlePayNow}
                  disabled={cart.length === 0}
                  className="checkout-btn"
                  style={{ background: '#1e3a5f' }}
                >
                  💳 Pay Now
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
    </div>
  );
}
