import { useEffect, useState } from "react";
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import LogoutButton from "../components/LogoutButton";
import "../App.css";
// ------------------------------------------------------
// ORDER STATUS FLOW (CONTROLLED WORKFLOW)
// This ensures vendors cannot randomly set statuses.
// Students will see this exact progression.
// ------------------------------------------------------
const ORDER_STATUS_FLOW = [
  "pending",
  "preparing",
  "ready",
  "completed"
];

export default function VendorDashboard() {
  const { user, role, loading } = useAuth();

  const [menuItems, setMenuItems] = useState([]);
  // Stores all orders that belong to the currently logged-in vendor
  const [vendorOrders, setVendorOrders] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    photoUrl: "",
    stock: 1, // stores how many units of the item are available
    available: true,
  });

  const [editingItemId, setEditingItemId] = useState(null);

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (loading || !user || role !== "vendor") return;

      try {
        const menuItemsRef = collection(db, "menuItems");
        const q = query(menuItemsRef, where("vendorId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu items:", error.message);
      }
    };

    fetchMenuItems();
  }, [user, role, loading]);

    // Fetch all orders that belong to the logged-in vendor.
  // This supports User Story 2: vendor needs to see all orders.
  useEffect(() => {
    const fetchVendorOrders = async () => {
      // Wait until auth is finished loading and make sure a vendor is logged in
      if (loading || !user || role !== "vendor") return;

      try {
        // Reference the orders collection in Firestore
        const ordersRef = collection(db, "orders");

        // Query only the orders that belong to this vendor
        // orderBy is removed for now to avoid Firestore index issues during development
        const q = query(
          ordersRef,
          where("vendorId", "==", user.uid)
        );

        const querySnapshot = await getDocs(q);

        // Convert Firestore documents into normal JavaScript objects
        const orders = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Save the vendor's orders into state so they can be displayed
        setVendorOrders(orders);
      } catch (error) {
        console.error("Error fetching vendor orders:", error.message);
      }
    };

    fetchVendorOrders();
  }, [user, role, loading]);

  // ------------------------------------------------------
// UPDATE ORDER STATUS FUNCTION
// This allows vendors to move orders through a strict pipeline:
// pending → preparing → ready → completed
// This updates Firestore so students see real-time changes.
// ------------------------------------------------------
const updateOrderStatus = async (orderId, newStatus) => {
  try {
    // Reference the specific order document in Firestore
    const orderRef = doc(db, "orders", orderId);

    // Update only the status field
    await updateDoc(orderRef, {
      status: newStatus,
    });

    // Update local UI state instantly (no refresh needed)
    setVendorOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId
          ? { ...order, status: newStatus }
          : order
      )
    );

  } catch (error) {
    console.error("Error updating order status:", error.message);
  }
};


  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previousFormData) => ({
      ...previousFormData,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedPrice = formData.price.trim();

    if (!trimmedName) {
      alert("Please enter an item name.");
      return;
    }

    if (!trimmedDescription) {
      alert("Please enter an item description.");
      return;
    }

    if (!trimmedPrice) {
      alert("Please enter a price.");
      return;
    }

    if (formData.stock < 0) {
      alert("Stock cannot be negative.");
      return;
    }
  
    if (editingItemId !== null) {
      const updatedMenuItem = {
        name: trimmedName,
        description: trimmedDescription,
        price: trimmedPrice,
        photoUrl: formData.photoUrl,
        stock: formData.stock, // saves the stock quantity when editing
        available: formData.stock > 0, // item is only available if stock is above 0
      };
  
      try {
        const itemRef = doc(db, "menuItems", editingItemId);
  
        await updateDoc(itemRef, updatedMenuItem);
  
        setMenuItems((previousMenuItems) =>
          previousMenuItems.map((item) =>
            item.id === editingItemId
              ? { ...item, ...updatedMenuItem }
              : item
          )
        );
  
        setEditingItemId(null);
      } catch (error) {
        console.error("Error updating menu item:", error.message);
      }
    } else {
      const newMenuItem = {
        vendorId: user.uid,
        name: trimmedName,
        description: trimmedDescription,
        price: trimmedPrice,
        photoUrl: formData.photoUrl,
        stock: formData.stock, // saves the stock quantity for new items
        available: formData.stock > 0, // automatically marks item sold out if stock is 0
      };
  
      addDoc(collection(db, "menuItems"), newMenuItem)
        .then((docRef) => {
          setMenuItems((previousMenuItems) => [
            ...previousMenuItems,
            { id: docRef.id, ...newMenuItem },
          ]);
        })
        .catch((error) => {
          console.error("Error adding menu item:", error.message);
        });
    }
  
    setFormData({
      name: "",
      description: "",
      price: "",
      photoUrl: "",
      stock: 1, // reset stock back to default after submit
      available: true,
    });
  };

  // Toggle stock-based availability.
  // If stock is above 0, clicking the button sets stock to 0 and marks the item sold out.
  // If stock is 0, clicking the button restores stock to 1 and marks the item available again.
  const toggleAvailability = async (id) => {
    const selectedItem = menuItems.find((item) => item.id === id);

    if (!selectedItem) return;

    // If item currently has stock, make it sold out by setting stock to 0.
    // If item is sold out, restore it with stock 1.
    const newStock = (selectedItem.stock ?? 0) > 0 ? 0 : 1;
    const newAvailability = newStock > 0;

    try {
      const itemRef = doc(db, "menuItems", id);

      await updateDoc(itemRef, {
        stock: newStock,
        available: newAvailability,
      });

      setMenuItems((previousMenuItems) =>
        previousMenuItems.map((item) =>
          item.id === id
            ? { ...item, stock: newStock, available: newAvailability }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating stock availability:", error.message);
    }
  };

  const handleEditClick = (item) => {
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      photoUrl: item.photoUrl,
      stock: item.stock ?? 1,
      available: item.available,
    });

    setEditingItemId(item.id);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  
    setFormData({
      name: "",
      description: "",
      price: "",
      photoUrl: "",
      stock: 1, // reset stock when leaving edit mode
      available: true,
    });
  };

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: "80px" }}>Loading...</p>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Vendor Dashboard</h1>
        <p>Manage your food items, prices, descriptions, and availability.</p>
      </header>

      <main className="container">
        <section className="form-section">
          <h2>{editingItemId !== null ? "Edit Menu Item" : "Add Menu Item"}</h2>

          <form className="menu-form" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              placeholder="Item name"
              value={formData.name}
              onChange={handleInputChange}
            />

            <textarea
              name="description"
              placeholder="Item description"
              value={formData.description}
              onChange={handleInputChange}
            ></textarea>

            <input
              type="text"
              name="price"
              placeholder="Price e.g. R65.00"
              value={formData.price}
              onChange={handleInputChange}
            />

            <input
              type="number"
              name="stock"
              placeholder="Stock quantity"
              value={formData.stock}
              onChange={handleInputChange}
              min="0"
            />

            <input
              type="text"
              name="photoUrl"
              placeholder="Photo URL"
              value={formData.photoUrl}
              onChange={handleInputChange}
            />

            <label className="checkbox-row">
              <input
                type="checkbox"
                name="available"
                checked={formData.available}
                onChange={handleInputChange}
              />
              Available
            </label>

            <div className="form-buttons">
              <button type="submit">
                {editingItemId !== null ? "Update Item" : "Add Item"}
              </button>

              {editingItemId !== null && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="menu-section">
          <h2>Current Menu</h2>

          <div className="menu-list">
            {menuItems.map((item) => (
              <div className="menu-card" key={item.id}>
                {item.photoUrl ? (
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="menu-image"
                  />
                ) : (
                  <div className="menu-image-placeholder">Image not available yet</div>
                )}

                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <p className="price">{item.price}</p>
                <p><strong>Stock:</strong> {item.stock ?? 0}</p>
                <p className={(item.stock ?? 0) > 0 ? "status available" : "status sold-out"}>
                  {(item.stock ?? 0) > 0 ? "Available" : "Sold Out"}
                </p>

                <div className="button-row">
                  <button
                    className="edit-btn"
                    type="button"
                    onClick={() => handleEditClick(item)}
                  >
                    Edit
                  </button>

                  <button
                    className="soldout-btn"
                    type="button"
                    onClick={() => toggleAvailability(item.id)}
                  >
                    {(item.stock ?? 0) > 0 ? "Mark as Sold Out" : "Mark as Available"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="menu-section">
          <h2>Incoming Orders</h2>

          {vendorOrders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            <div className="menu-list">
              {vendorOrders.map((order) => (
                <div className="menu-card" key={order.id}>
                  {/* Show order summary information */}
                  <h3>Order #{order.id.slice(0, 6)}</h3>
                  <p><strong>Student ID:</strong> {order.studentId}</p>
                  {/* ------------------------------------------------------
    STATUS CONTROL DROPDOWN
    Vendors can only move forward in workflow.
------------------------------------------------------ */}
                  <p><strong>Status:</strong></p>

                  <select
                    value={order.status}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    style={{
                      padding: "6px",
                      borderRadius: "6px",
                      marginTop: "5px"
                    }}
                  >
                    {ORDER_STATUS_FLOW.map((statusOption) => (
                      <option
                        key={statusOption}
                        value={statusOption}
                        disabled={
                          // Prevent skipping backwards/forwards incorrectly
                          ORDER_STATUS_FLOW.indexOf(statusOption) <
                          ORDER_STATUS_FLOW.indexOf(order.status)
                        }
                      >
                        {statusOption.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <p><strong>Total:</strong> R{order.total.toFixed(2)}</p>

                  {/* Show each item inside the order */}
                  <div style={{ marginTop: "1rem", textAlign: "left" }}>
                    <strong>Items:</strong>
                    {order.items.map((item, index) => (
                      <div key={index} style={{ marginTop: "0.5rem" }}>
                        <p>
                          {item.name} - {item.price} x {item.quantity}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <LogoutButton />
      </div>
    </div>
  );
}