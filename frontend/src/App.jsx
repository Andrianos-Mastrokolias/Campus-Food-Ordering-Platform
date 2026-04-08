import "./App.css";

function App() {
  const sampleMenuItems = [
    {
      id: 1,
      name: "Chicken Burger",
      description: "Grilled chicken burger with chips",
      price: "R65.00",
      available: true,
    },
    {
      id: 2,
      name: "Veg Wrap",
      description: "Fresh veggie wrap with hummus",
      price: "R55.00",
      available: false,
    },
  ];

  return (
    <div className="app">
      <header className="header">
        <h1>Vendor Menu Management</h1>
        <p>Manage your food items, prices, descriptions, and availability.</p>
      </header>

      <main className="container">
        <section className="form-section">
          <h2>Add Menu Item</h2>
          <form className="menu-form">
            <input type="text" placeholder="Item name" />
            <textarea placeholder="Item description"></textarea>
            <input type="text" placeholder="Price e.g. R65.00" />
            <input type="text" placeholder="Photo URL" />

            <label className="checkbox-row">
              <input type="checkbox" defaultChecked />
              Available
            </label>

            <button type="submit">Add Item</button>
          </form>
        </section>

        <section className="menu-section">
          <h2>Current Menu</h2>

          <div className="menu-list">
            {sampleMenuItems.map((item) => (
              <div className="menu-card" key={item.id}>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <p className="price">{item.price}</p>
                <p className={item.available ? "status available" : "status sold-out"}>
                  {item.available ? "Available" : "Sold Out"}
                </p>

                <div className="button-row">
                  <button className="edit-btn">Edit</button>
                  <button className="soldout-btn">
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