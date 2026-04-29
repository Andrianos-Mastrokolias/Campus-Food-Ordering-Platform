import { useEffect, useState } from "react";
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import LogoutButton from "../components/LogoutButton";
import "../App.css";

// ------------------------------------------------------
// ORDER STATUS FLOW
// This defines the valid order status progression.
// Vendors should move orders forward through these stages
// so students see a consistent tracking flow.
// ------------------------------------------------------
const ORDER_STATUS_FLOW = [
  "pending",
  "preparing",
  "ready",
  "completed"
];

export default function VendorDashboard() {
  // Auth context gives access to the logged-in user, their role, and loading state
  const { user, role, loading } = useAuth();

  // Stores the logged-in vendor's approved business profile
  // This allows the dashboard heading to show the actual vendor name and description
  const [vendorProfile, setVendorProfile] = useState(null);

  // Stores all menu items that belong to the logged-in vendor
  const [menuItems, setMenuItems] = useState([]);

  // Stores all orders that belong to the logged-in vendor
  const [vendorOrders, setVendorOrders] = useState([]);

  // Stores a preview of the image pasted into the form.
  // This does not save anything yet; it only helps us test the paste feature safely.
  const [imagePreview, setImagePreview] = useState("");

  // Stores the current values entered in the menu item form
  // stock keeps track of how many units of the item are available
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    photoUrl: "",
    stock: 1,
    available: true,
  });

  // Stores the ID of the item currently being edited
  // If null, the form is being used to add a new item
  const [editingItemId, setEditingItemId] = useState(null);

  // Fetch the logged-in vendor's profile from the users collection
  // Vendor profile details were saved when the admin approved the vendor application
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

  // Fetch all menu items that belong to the logged-in vendor
  // This ensures each vendor only sees and manages their own menu
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (loading || !user || role !== "vendor") return;

      try {
        const menuItemsRef = collection(db, "menuItems");
        const q = query(menuItemsRef, where("vendorId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        // Convert Firestore documents into normal JavaScript objects
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

  // Fetch all orders that belong to the logged-in vendor
  // Vendors can see their incoming orders
  useEffect(() => {
    const fetchVendorOrders = async () => {
      if (loading || !user || role !== "vendor") return;

      try {
        // Reference the orders collection in Firestore
        const ordersRef = collection(db, "orders");

        // Query only the orders that belong to this vendor
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

  // Update the status of a specific order in Firestore
  // This allows the vendor to move the order through the workflow
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      // Reference the specific order document in Firestore
      const orderRef = doc(db, "orders", orderId);

      // Update only the status field
      await updateDoc(orderRef, {
        status: newStatus,
      });

      // Update local UI state instantly without needing a page refresh
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

  // Handles when a user pastes an image (Cmd+V / Ctrl+V)
  // Converts the image into base64 and stores it for preview
  const handleImagePaste = (event) => {
    const items = event.clipboardData.items;
  
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
  
      if (item.type.includes("image")) {
        const file = item.getAsFile();
        const reader = new FileReader();
  
        reader.onload = (e) => {
          const img = new Image();
  
          img.onload = () => {
            const canvas = document.createElement("canvas");
  
            // Resize pasted image so Firestore can store it safely
            canvas.width = 400;
            canvas.height = 300;
  
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
            // Compress image into smaller JPEG base64
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.6);
  
            setImagePreview(compressedBase64);
  
            setFormData((previousFormData) => ({
              ...previousFormData,
              photoUrl: compressedBase64,
            }));
          };
  
          img.src = e.target.result;
        };
  
        reader.readAsDataURL(file);
        return;
      }
    }
  };

  // Handles all form input changes
  // Converts checkboxes to booleans and number inputs to numbers
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

  // Handles adding a new menu item or updating an existing one
  // Also validates that required fields are filled in correctly
  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedPrice = formData.price.trim();

    // Validation: item name must not be empty
    if (!trimmedName) {
      alert("Please enter an item name.");
      return;
    }

    // Validation: description must not be empty
    if (!trimmedDescription) {
      alert("Please enter an item description.");
      return;
    }

    // Validation: price must not be empty
    if (!trimmedPrice) {
      alert("Please enter a price.");
      return;
    }

    // Validation: stock cannot be negative
    if (formData.stock < 0) {
      alert("Stock cannot be negative.");
      return;
    }

    if (editingItemId !== null) {
      // Update an existing menu item in Firestore
      // Stock is saved and availability is derived from stock
      const updatedMenuItem = {
        name: trimmedName,
        description: trimmedDescription,
        price: trimmedPrice,
        photoUrl: imagePreview || formData.photoUrl,
        stock: formData.stock,
        available: formData.stock > 0,
      };

      try {
        const itemRef = doc(db, "menuItems", editingItemId);

        await updateDoc(itemRef, updatedMenuItem);

        // Update local state so the UI reflects the latest item values immediately
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
      // Create a new menu item for this vendor
      // If stock is 0, the item is automatically marked as sold out
      const newMenuItem = {
        vendorId: user.uid,
        name: trimmedName,
        description: trimmedDescription,
        price: trimmedPrice,
        photoUrl: imagePreview || formData.photoUrl,
        stock: formData.stock,
        available: formData.stock > 0,
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

    // Reset the form back to its default state after submitting
    setFormData({
      name: "",
      description: "",
      price: "",
      photoUrl: "",
      stock: 1,
      available: true,
    });
    setImagePreview("");
  };

  // Toggle stock-based availability
  // If stock is above 0, set it to 0 to mark as sold out
  // If stock is 0, restore it to 1 to mark as available again
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

      // Update local state immediately after Firestore update
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

  // Load the selected item's current values into the form
  // This allows the vendor to edit an existing menu item
  const handleEditClick = (item) => {
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      photoUrl: item.photoUrl,
      stock: item.stock ?? 1,
      available: item.available,
    });
  
    setImagePreview(item.photoUrl || "");
  
    setEditingItemId(item.id);
  };

  // Cancel edit mode and reset the form back to default values
  const handleCancelEdit = () => {
    setEditingItemId(null);

    setFormData({
      name: "",
      description: "",
      price: "",
      photoUrl: "",
      stock: 1,
      available: true,
    });
  };

  // While authentication is still loading, show a loading message
  if (loading) {
    return <p style={{ textAlign: "center", marginTop: "80px" }}>Loading...</p>;
  }

  return (
    <div className="app">
      <header className="header">
        {/* Display vendor business name if it exists, otherwise fallback to default heading */}
        <h1>{vendorProfile?.businessName || "Vendor Dashboard"}</h1>

        {/* Display vendor business description if it exists, otherwise fallback to default description */}
        <p>
          {vendorProfile?.businessDescription ||
            "Manage your food items, prices, descriptions, and availability."}
        </p>
      </header>

      <main className="container">
        {/* Menu management form section
            Used to add new items or edit existing ones */}
        <section className="form-section">
          <h2>{editingItemId !== null ? "Edit Menu Item" : "Add Menu Item"}</h2>

          <form className="menu-form" onSubmit={handleSubmit} onPaste={handleImagePaste}>
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

            {/* Shows a preview when an image is pasted into the form */}
            {imagePreview && (
              <div style={{ marginTop: "10px", textAlign: "center" }}>
                <p>Image preview:</p>
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
              </div>
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

        {/* Current menu section
            Displays all menu items that belong to the vendor */}
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

                {/* Shows the current stock value for each menu item */}
                <p><strong>Stock:</strong> {item.stock ?? 0}</p>

                {/* Availability is displayed based on stock
                    If stock is 0, the item is shown as sold out */}
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

        {/* Incoming orders section
            Displays all orders that belong to the logged-in vendor */}
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

                  {/* Dropdown used to move an order through the allowed status flow */}
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
                          // Prevent vendors from moving an order backwards in the workflow
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