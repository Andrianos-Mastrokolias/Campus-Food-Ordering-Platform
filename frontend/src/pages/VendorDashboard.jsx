import { useEffect, useState } from "react";
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import LogoutButton from "../components/LogoutButton";
import "../App.css";

export default function VendorDashboard() {
  const { user, role, loading } = useAuth();

  const [menuItems, setMenuItems] = useState([
    {
      id: 1,
      name: "Chicken Burger",
      description: "Grilled chicken burger with chips",
      price: "R65.00",
      photoUrl: "",
      available: true,
    },
    {
      id: 2,
      name: "Veg Wrap",
      description: "Fresh veggie wrap with hummus",
      price: "R55.00",
      photoUrl: "",
      available: false,
    },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    photoUrl: "",
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

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previousFormData) => ({
      ...previousFormData,
      [name]: type === "checkbox" ? checked : value,
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
  
    if (editingItemId !== null) {
      const updatedMenuItem = {
        name: trimmedName,
        description: trimmedDescription,
        price: trimmedPrice,
        photoUrl: formData.photoUrl,
        available: formData.available,
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
        available: formData.available,
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
      available: true,
    });
  };

  const toggleAvailability = async (id) => {
    const selectedItem = menuItems.find((item) => item.id === id);
  
    if (!selectedItem) return;
  
    const newAvailability = !selectedItem.available;
  
    try {
      const itemRef = doc(db, "menuItems", id);
      await updateDoc(itemRef, {
        available: newAvailability,
      });
  
      setMenuItems((previousMenuItems) =>
        previousMenuItems.map((item) =>
          item.id === id ? { ...item, available: newAvailability } : item
        )
      );
    } catch (error) {
      console.error("Error updating availability:", error.message);
    }
  };

  const handleEditClick = (item) => {
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      photoUrl: item.photoUrl,
      available: item.available,
    });

    setEditingItemId(item.id);
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

            <button type="submit">
              {editingItemId !== null ? "Update Item" : "Add Item"}
            </button>
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
                <p className={item.available ? "status available" : "status sold-out"}>
                  {item.available ? "Available" : "Sold Out"}
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
                    {item.available ? "Mark as Sold Out" : "Mark as Available"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <LogoutButton />
      </div>
    </div>
  );
}