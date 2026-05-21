import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import LogoutButton from "../components/LogoutButton";
import notificationService from "../services/notificationService";

// --------------------------------------------------
// DIETARY + ALLERGEN DATA
// Standardised food metadata used across the system.
// --------------------------------------------------
import {
  ALLERGEN_OPTIONS,
  DIETARY_TAG_OPTIONS,
} from "../data/dietaryAllergenData";
import "../App.css";
import "./VendorDashboard.css";

const ORDER_STATUS_FLOW = ["paid", "preparing", "ready", "completed"];

export default function VendorDashboard() {
  const { user, role, loading } = useAuth();


 // --------------------------------------------------
 // COMPONENT STATE
 // Stores vendor profile information, menu items,
 // orders, modal state, and form data.
 // --------------------------------------------------

  const [vendorProfile, setVendorProfile] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [imagePreview, setImagePreview] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    photoUrl: "",
    stock: 1,
    available: true,
    allergens: [],
    dietaryTags: [],
  });

  useEffect(() => {
    const fetchVendorProfile = async () => {
      if (loading || !user || role !== "vendor") return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setVendorProfile(userData.vendorProfile || null);
        }
      } catch (error) {
        console.error("Error fetching vendor profile:", error.message);
      }
    };

    fetchVendorProfile();
  }, [user, role, loading]);

  // --------------------------------------------------
  // FETCH MENU ITEMS
  // Loads all menu items created by this vendor.
  // --------------------------------------------------

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

  useEffect(() => {
    const fetchVendorOrders = async () => {
      if (loading || !user || role !== "vendor") return;

      try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("vendorId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        const orders = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setVendorOrders(orders);
      } catch (error) {
        console.error("Error fetching vendor orders:", error.message);
      }
    };

    fetchVendorOrders();
  }, [user, role, loading]);

// Reduces stock for each menu item in an order.
// This runs when the vendor marks an order as ready/completed.
// Stock is only reduced once per order using the stockDeducted flag.
const reduceStockForOrderItems = async (orderItems) => {
  const stockChangesByItemId = {};

  // Combine quantities for duplicate items in the same order.
  orderItems.forEach((item) => {
    if (!item.id) return;

    const quantity = Number(item.quantity || item.qty || 1);
    stockChangesByItemId[item.id] =
      (stockChangesByItemId[item.id] || 0) + quantity;
  });

  for (const menuItemId of Object.keys(stockChangesByItemId)) {
    const quantityOrdered = stockChangesByItemId[menuItemId];
    const menuItemRef = doc(db, "menuItems", menuItemId);
    const menuItemSnap = await getDoc(menuItemRef);

    if (!menuItemSnap.exists()) continue;

    const menuItemData = menuItemSnap.data();
    const currentStock = Number(menuItemData.stock ?? 0);
    const updatedStock = Math.max(currentStock - quantityOrdered, 0);

    await updateDoc(menuItemRef, {
      stock: updatedStock,
      available: updatedStock > 0,
    });

    // Update local menu state so the dashboard changes immediately.
    setMenuItems((previousMenuItems) =>
      previousMenuItems.map((menuItem) =>
        menuItem.id === menuItemId
          ? {
              ...menuItem,
              stock: updatedStock,
              available: updatedStock > 0,
            }
          : menuItem
      )
    );
  }
};

  // --------------------------------------------------
  // UPDATE ORDER STATUS
  // Updates order progress and sends email
  // notifications when an order becomes ready.
  // --------------------------------------------------
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const selectedOrder = vendorOrders.find((order) => order.id === orderId);

      const shouldDeductStock =
        selectedOrder &&
        !selectedOrder.stockDeducted &&
        (newStatus === "ready" || newStatus === "completed");

      if (shouldDeductStock) {
        await reduceStockForOrderItems(selectedOrder.items || []);
      }

      const orderUpdate = {
        status: newStatus,
      };

      if (shouldDeductStock) {
        orderUpdate.stockDeducted = true;
        orderUpdate.stockDeductedAt = serverTimestamp();
      }

      // Update order status in Firestore
      await updateDoc(orderRef, orderUpdate);

      // Send notification when order is ready
      if (newStatus === "ready" && selectedOrder) {
        try {
          await notificationService.sendOrderReadyEmail({
            ...selectedOrder,
            status: newStatus,
          });
        } catch (emailError) {
          console.error(
            "Order status updated, but email notification failed:",
            emailError
          );
        }
      }

      // Update local order state
      setVendorOrders((previousOrders) =>
        previousOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                ...(shouldDeductStock ? { stockDeducted: true } : {}),
              }
            : order
        )
      );
    } catch (error) {
      console.error("Error updating order status:", error.message);
    }
  };

  // Handles pasted images inside the menu item form
  // Handles when a user pastes an image (Cmd+V / Ctrl+V)
  // Converts the image into base64 and stores it for preview
  const handleImagePaste = (event) => {
    const items = event.clipboardData.items;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.includes("image")) {
        const file = item.getAsFile();
        // FileReader is used to read the image file as base64
        const reader = new FileReader();

        reader.onload = (e) => {
          const img = new Image();
          
          // Runs once the image has loaded into memory
          img.onload = () => {
            // Create a canvas to resize/compress the image
            const canvas = document.createElement("canvas");

            canvas.width = 400;
            canvas.height = 300;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);

            setImagePreview(compressedBase64);

            setFormData((previousFormData) => ({
              ...previousFormData,
              photoUrl: compressedBase64,
            }));
          };
          
          // Start loading image from FileReader result
          img.src = e.target.result;
        };

        reader.readAsDataURL(file);
        return;
      }
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

  // Handles multi-select checkbox changes for dietary tags and allergens.
  // If an option is already selected, it is removed; otherwise, it is added.
  const handleMultiSelectChange = (fieldName, optionId) => {
    setFormData((previousFormData) => {
      const currentValues = previousFormData[fieldName] || [];

      const updatedValues = currentValues.includes(optionId)
        ? currentValues.filter((value) => value !== optionId)
        : [...currentValues, optionId];

      return {
        ...previousFormData,
        [fieldName]: updatedValues,
      };
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      photoUrl: "",
      stock: 1,
      available: true,
      allergens: [],
      dietaryTags: [],
    });

    setImagePreview("");
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
        photoUrl: imagePreview || formData.photoUrl,
        stock: formData.stock,
        available: formData.stock > 0,
        allergens: formData.allergens || [],
        dietaryTags: formData.dietaryTags || [],
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
        setSelectedItem(null);
        setIsEditModalOpen(false);
        resetForm();
      } catch (error) {
        console.error("Error updating menu item:", error.message);
      }
    } else {
      const newMenuItem = {
        vendorId: user.uid,
        name: trimmedName,
        description: trimmedDescription,
        price: trimmedPrice,
        photoUrl: imagePreview || formData.photoUrl,
        stock: formData.stock,
        available: formData.stock > 0,
        allergens: formData.allergens || [],
        dietaryTags: formData.dietaryTags || [],
      };

      addDoc(collection(db, "menuItems"), newMenuItem)
        .then((docRef) => {
          setMenuItems((previousMenuItems) => [
            ...previousMenuItems,
            { id: docRef.id, ...newMenuItem },
          ]);
          resetForm();
        })
        .catch((error) => {
          console.error("Error adding menu item:", error.message);
        });
    }
  };

  const toggleAvailability = async (id) => {
    const selectedItem = menuItems.find((item) => item.id === id);

    if (!selectedItem) return;

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

  const handleDeleteItem = async (id, itemName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${itemName}"?`
    );

    if (!confirmDelete) return;

    try {
      const itemRef = doc(db, "menuItems", id);

      await deleteDoc(itemRef);

      setMenuItems((previousMenuItems) =>
        previousMenuItems.filter((item) => item.id !== id)
      );
    } catch (error) {
      console.error("Error deleting menu item:", error.message);
      alert("Failed to delete menu item. Please try again.");
    }
  };

  const handleEditClick = (item) => {
    setSelectedItem(item);

    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      photoUrl: item.photoUrl,
      stock: item.stock ?? 1,
      available: item.available,
      allergens: item.allergens || [],
      dietaryTags: item.dietaryTags || [],
    });

    setImagePreview(item.photoUrl || "");
    setEditingItemId(item.id);
    setIsEditModalOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setSelectedItem(null);
    setIsEditModalOpen(false);
    resetForm();
  };

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: "80px" }}>Loading...</p>;
  }

  const sortedOrders = [...vendorOrders].sort(
    (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  );

  const latestOrderId = sortedOrders.length > 0 ? sortedOrders[0].id : null;

  const groupedOrders = {
    paid: [],
    preparing: [],
    ready: [],
    completed: [],
  };

  sortedOrders.forEach((order) => {
    if (groupedOrders[order.status]) {
      groupedOrders[order.status].push(order);
    }
  });

  // Converts a stored dietary tag ID into a readable label.
  // Example: "halal" becomes "Halal".
  const getDietaryLabel = (tagId) => {
    return (
      DIETARY_TAG_OPTIONS.find((option) => option.id === tagId)?.label || tagId
    );
  };

  // Converts a stored allergen ID into a readable label.
  // Example: "cow_milk" becomes "Cow's Milk".
  const getAllergenLabel = (allergenId) => {
    return (
      ALLERGEN_OPTIONS.find((option) => option.id === allergenId)?.label ||
      allergenId
    );
  };

  const activeOrderCount =
    groupedOrders.paid.length +
    groupedOrders.preparing.length +
    groupedOrders.ready.length;

  const renderVendorOrderCard = (order) => (
  <article
    key={order.id}
    className={`
      order-card
      ${order.id === latestOrderId ? "highlight latest-order-card" : ""}
      ${order.status === "ready" ? "ready-card" : ""}
    `}
  >
    <header className="order-card-top">
      <h3>
        Order #{order.orderId?.slice(0, 10) || order.id.slice(0, 6)}
      </h3>

      <mark className={`order-status-label status-${order.status}`}>
        {order.status?.toUpperCase()}
      </mark>
    </header>

    <p className="paid-badge">💰 Payment Confirmed</p>

    <p className="order-info">
      <strong>Student:</strong> #{order.studentId?.slice(0, 6)}
    </p>

    {order.orderId && (
      <p style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
        Shared Order ID: {order.orderId}
      </p>
    )}

    {order.vendorOrderId && (
      <p style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
        Vendor Order ID: {order.vendorOrderId}
      </p>
    )}

    <section className="order-status-section">
      <label className="order-label">Update Status</label>

      <select
        value={order.status}
        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
        className="order-status-select"
      >
        {ORDER_STATUS_FLOW.map((statusOption) => (
          <option
            key={statusOption}
            value={statusOption}
            disabled={
              ORDER_STATUS_FLOW.indexOf(statusOption) <
              ORDER_STATUS_FLOW.indexOf(order.status)
            }
          >
            {statusOption.toUpperCase()}
          </option>
        ))}
      </select>
    </section>

    <p className="order-total">
      Total: R{(order.total || 0).toFixed(2)}
    </p>

    <section className="order-items">
      <h4>Items</h4>

      <ul>
        {(order.items || []).map((item, index) => (
          <li key={index}>
            {item.name} × {item.quantity}
          </li>
        ))}
      </ul>
    </section>
  </article>
);

  return (
    <main className="app">
      <header className="header">
        <h1>{vendorProfile?.businessName || "Vendor Dashboard"}</h1>
        <p>
          {vendorProfile?.businessDescription ||
            "Manage your food items, prices, descriptions, and availability."}
        </p>
      </header>

      <nav
          className="analytics-btn-container"
          style={{ textAlign: "center" }}
      >
          <Link to="/vendor/analytics">
            <button
              type="button"
              className="analytics-dashboard-btn"
      >
          📈 View Analytics
            </button>
          </Link>
      </nav>

     <main className="vendor-dashboard-layout">
      <section className="orders-section">
      <header className="orders-header">
      <section>
        <h2>Incoming Orders</h2>
        <p>Manage and update student orders</p>
      </section>

      <p className="order-count">
        {activeOrderCount} active
      </p>
      </header>

    {groupedOrders.ready.length > 0 && (
      <section className="order-section">
        <h2>🔔 Ready</h2>

        <section className="orders-row">
          {groupedOrders.ready.map(renderVendorOrderCard)}
        </section>
      </section>
    )}

    {groupedOrders.preparing.length > 0 && (
      <section className="order-section">
        <h2>👨‍🍳 Preparing</h2>

        <section className="orders-row">
          {groupedOrders.preparing.map(renderVendorOrderCard)}
        </section>
      </section>
    )}

    {groupedOrders.paid.length > 0 && (
      <section className="order-section">
        <h2>🟡 Paid</h2>

        <section className="orders-row">
          {groupedOrders.paid.map(renderVendorOrderCard)}
        </section>
      </section>
    )}

    {activeOrderCount === 0 && (
      <p>No active orders right now.</p>
    )}

    {groupedOrders.completed.length > 0 && (
      <section className="completed-orders-section">
        <button
          type="button"
          className="completed-toggle-btn"
          onClick={() => setShowCompleted(!showCompleted)}
        >
          {showCompleted
            ? "Hide Completed Orders"
            : `View Completed Orders (${groupedOrders.completed.length})`}
        </button>

        {showCompleted && (
          <section className="orders-row">
            {groupedOrders.completed.map(renderVendorOrderCard)}
          </section>
        )}
      </section>
    )}
  </section>

  <section className="dashboard-grid">
    <section className="form-section">
      <h2>
        {editingItemId !== null
          ? "Edit Menu Item"
          : "Add Menu Item"}
      </h2>

      <form
        className="menu-form"
        onSubmit={handleSubmit}
        onPaste={handleImagePaste}
      >
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

        <section className="checkbox-group-section">
          <h4>Dietary Tags</h4>

          <p className="helper-text">
            Select all dietary labels that apply to this item.
          </p>

          <section className="checkbox-options-grid">
            {DIETARY_TAG_OPTIONS.map((option) => (
              <label
                key={option.id}
                className="checkbox-option"
              >
                <input
                  type="checkbox"
                  checked={(formData.dietaryTags || []).includes(
                    option.id
                  )}
                  onChange={() =>
                    handleMultiSelectChange(
                      "dietaryTags",
                      option.id
                    )
                  }
                />
                {option.label}
              </label>
            ))}
          </section>
        </section>

        <section className="checkbox-group-section">
          <h4>Allergens</h4>

          <p className="helper-text">
            Select allergens that the item contains or may contain.
          </p>

          <section className="checkbox-options-grid">
            {ALLERGEN_OPTIONS.map((option) => (
              <label
                key={option.id}
                className="checkbox-option"
              >
                <input
                  type="checkbox"
                  checked={(formData.allergens || []).includes(
                    option.id
                  )}
                  onChange={() =>
                    handleMultiSelectChange(
                      "allergens",
                      option.id
                    )
                  }
                />
                {option.label}
              </label>
            ))}
          </section>
        </section>

        {imagePreview && (
          <figure
            style={{
              marginTop: "10px",
              textAlign: "center",
            }}
          >
            <figcaption>Image preview:</figcaption>

            <img
              src={imagePreview}
              alt="Preview"
              style={{
                width: "160px",
                height: "120px",
                objectFit: "cover",
                borderRadius: "10px",
              }}
            />
          </figure>
        )}

        <label className="checkbox-row">
          <input
            type="checkbox"
            name="available"
            checked={formData.available}
            onChange={handleInputChange}
          />
          Available
        </label>

        <footer className="form-buttons">
          <button type="submit">
            {editingItemId !== null
              ? "Update Item"
              : "Add Item"}
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
        </footer>
      </form>
    </section>

    <section className="menu-section">
      <h2>Current Menu</h2>

      <section className="menu-list">
        {menuItems.map((item) => (
          <article className="menu-card" key={item.id}>
            {item.photoUrl ? (
              <img
                src={item.photoUrl}
                alt={item.name}
                className="menu-image"
              />
            ) : (
              <section className="menu-image-placeholder">
                <p>Image not available yet</p>
              </section>
            )}

            <h3>{item.name}</h3>

            <p>{item.description}</p>

            <p className="price">{item.price}</p>

            {item.dietaryTags?.length > 0 && (
              <section className="tag-section">
                <strong>Dietary:</strong>

                <section className="tag-row">
                  {item.dietaryTags.map((tagId) => (
                    <mark
                      key={tagId}
                      className="dietary-tag"
                    >
                      {getDietaryLabel(tagId)}
                    </mark>
                  ))}
                </section>
              </section>
            )}

            {item.allergens?.length > 0 && (
              <section className="tag-section">
                <strong>Allergens:</strong>

                <section className="tag-row">
                  {item.allergens.map((allergenId) => (
                    <mark
                      key={allergenId}
                      className="allergen-tag"
                    >
                      {getAllergenLabel(allergenId)}
                    </mark>
                  ))}
                </section>
              </section>
            )}

            <p>
              <strong>Stock:</strong> {item.stock ?? 0}
            </p>

            <p
              className={
                (item.stock ?? 0) > 0
                  ? "status available"
                  : "status sold-out"
              }
            >
              {(item.stock ?? 0) > 0
                ? "Available"
                : "Sold Out"}
            </p>

            <footer className="button-row">
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
                {(item.stock ?? 0) > 0
                  ? "Mark as Sold Out"
                  : "Mark as Available"}
              </button>

              <button
                className="delete-btn"
                type="button"
                onClick={() =>
                  handleDeleteItem(item.id, item.name)
                }
                style={{
                  backgroundColor: "#e74c3c",
                  color: "white",
                }}
              >
                Delete
              </button>
            </footer>
          </article>
        ))}
      </section>
    </section>
  </section>
</main>

      {isEditModalOpen && selectedItem && (
  <aside className="modal-overlay" onClick={handleCancelEdit}>
    <section
      className="edit-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="modal-header">
        <h2>Edit Menu Item</h2>

        <button
          type="button"
          className="modal-close-btn"
          onClick={handleCancelEdit}
          aria-label="Close edit menu item modal"
        >
          ×
        </button>
      </header>

      <form
        className="menu-form"
        onSubmit={handleSubmit}
        onPaste={handleImagePaste}
      >
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

        <section className="checkbox-group-section">
          <h4>Dietary Tags</h4>

          <p className="helper-text">
            Select all dietary labels that apply to this item.
          </p>

          <section className="checkbox-options-grid">
            {DIETARY_TAG_OPTIONS.map((option) => (
              <label key={option.id} className="checkbox-option">
                <input
                  type="checkbox"
                  checked={(formData.dietaryTags || []).includes(option.id)}
                  onChange={() =>
                    handleMultiSelectChange("dietaryTags", option.id)
                  }
                />
                {option.label}
              </label>
            ))}
          </section>
        </section>

        <section className="checkbox-group-section">
          <h4>Allergens</h4>

          <p className="helper-text">
            Select allergens that the item contains or may contain.
          </p>

          <section className="checkbox-options-grid">
            {ALLERGEN_OPTIONS.map((option) => (
              <label key={option.id} className="checkbox-option">
                <input
                  type="checkbox"
                  checked={(formData.allergens || []).includes(option.id)}
                  onChange={() =>
                    handleMultiSelectChange("allergens", option.id)
                  }
                />
                {option.label}
              </label>
            ))}
          </section>
        </section>

        {imagePreview && (
          <figure style={{ marginTop: "10px", textAlign: "center" }}>
            <figcaption>Image preview:</figcaption>

            <img
              src={imagePreview}
              alt="Preview"
              style={{
                width: "160px",
                height: "120px",
                objectFit: "cover",
                borderRadius: "10px",
              }}
            />
          </figure>
        )}

        <label className="checkbox-row">
          <input
            type="checkbox"
            name="available"
            checked={formData.available}
            onChange={handleInputChange}
          />
          Available
        </label>

        <footer className="form-buttons">
          <button type="submit">Update Item</button>

          <button
            type="button"
            className="cancel-btn"
            onClick={handleCancelEdit}
          >
            Cancel
          </button>
        </footer>
      </form>
    </section>
  </aside>
)}
    </main>
  );
}