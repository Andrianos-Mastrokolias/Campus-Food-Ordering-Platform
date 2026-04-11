import { useEffect, useState } from "react"; //useState lets React store data that can change while the app is running
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./context/AuthContext";
import "./App.css";


function App(){

  const { user, role, loading } = useAuth();

  const [menuItems, setMenuItems] = useState([ //stores current menu items shown on page
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

  const [formData, setFormData] = useState({ //stores what the vendor is typing into the form right now
    name: "",
    description: "",
    price: "",
    photoUrl: "",
    available: true,  
  });

  useEffect(() => {
    const fetchMenuItems = async () => {
      if (loading || !user || role !== "vendor") return;

      try{
        const menuItemsRef = collection(db, "menuItems");
        const q = query(menuItemsRef, where("vendorId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        const items = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setMenuItems(items);
      } catch (error) {
        console.error("Error fetching menu items: ", error.message);
      }
    };

    fetchMenuItems();
  },  [user, role, loading]);

  const [editingItemId, setEditingItemId] = useState(null);//stores which item is being edited

  const handleInputChange = (event) => { //runs everytime  the user types in an input or changes the checkbox
    const {name, value, type, checked} = event.target;

    setFormData((previousFormData) => ({
      ...previousFormData, [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();//so the page does not reload automatically

    if (editingItemId !== null) { //edit existing item, replace with form values
      setMenuItems((previousMenuItems) =>
        previousMenuItems.map((item) =>
          item.id === editingItemId
            ? {
                ...item,
                name: formData.name,
                description: formData.description,
                price: formData.price,
                photoUrl: formData.photoUrl,
                available: formData.available,
              }
            : item
        )
      );
  
      setEditingItemId(null);
    } else { //new item
      const newMenuItem = {
        id: Date.now(),
        name: formData.name,
        description: formData.description,
        price: formData.price,
        photoUrl: formData.photoUrl,
        available: formData.available,
      };

      setMenuItems((previousMenuItems) => [...previousMenuItems, newMenuItem]);//adds the new item to the end of the existing menu list by creating a new array with existing items plus new item
    }

    setFormData({ //after adding new item, clears the form if the vendor wants to add another item
      name: "",
      description: "",
      price: "",
      photoUrl: "",
      available: true,
    });
  };

  const toggleAvailability = (id) => { //takes an item id
    setMenuItems((previousMenuItems) => //updates using the exiting previous menu items
      previousMenuItems.map((item) => //map goes through every item in the array, if it was the one clicked, updates it
        item.id === id //checks if the current item is the one we want to update
          ? {...item, available: !item.available} //copy all existing item data, replaces available with opposite value
          : item
        )
      );
  };

  const handleEditClick = (item) => { //when vendor clicks edit, it copies the details into the form and stores the item's id in editingItemId
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      photoUrl: item.photoUrl,
      available: item.available,
    });

    setEditingItemId(item.id);
  }

  return ( //what gets displayed ie what the user sees
    <div className="app"> 
      <header className="header">
        <h1>Vendor Menu Management</h1>
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
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <p className="price">{item.price}</p>
                <p className={item.available ? "status available" : "status sold-out"}>
                  {item.available ? "Available" : "Sold Out"}
                </p>

                <div className="button-row">
                  <button className="edit-btn"
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
    </div>
  );
}

export default App;