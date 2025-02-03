// Required Modules
const express = require("express");
const app = express();
const port = 3000;
var bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs"); // set the app to use ejs for rendering
app.use(express.static(__dirname + "/public")); // set location of static files

// Set up SQLite
const sqlite3 = require("sqlite3").verbose();
global.db = new sqlite3.Database("./database.db", function (err) {
  if (err) {
    console.error(err);
    process.exit(1); // bail out we can't connect to the DB
  } else {
    console.log("Database connected");
    global.db.run("PRAGMA foreign_keys=ON"); // tell SQLite to pay attention to foreign key constraints

    // Create customer table if not exists
    const createCustomerTable = `
        CREATE TABLE IF NOT EXISTS customer (
          customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_name TEXT NOT NULL,
          customer_email TEXT UNIQUE NOT NULL,
          customer_phone_number TEXT NOT NULL,  
          customer_password TEXT NOT NULL,
          customer_image TEXT
        );
      `;
    global.db.run(createCustomerTable, (err) => {
      if (err) {
        console.error("Error creating customer table:", err);
      } else {
        console.log("Customer table is ready");
      }
    });

    // Create restaurant table if not exists
    const createRestaurantTable = `
        CREATE TABLE IF NOT EXISTS restaurants (
          restaurant_id INTEGER PRIMARY KEY AUTOINCREMENT,
          restaurant_name TEXT NOT NULL,
          restaurant_email TEXT UNIQUE NOT NULL,
          restaurant_password TEXT NOT NULL
        );
      `;
    global.db.run(createRestaurantTable, (err) => {
      if (err) {
        console.error("Error creating restaurant table:", err);
      } else {
        console.log("Restaurant table is ready");
      }
    });
  }
});

const session = require("express-session");
app.use(
  session({
    secret: "dineclick",
    resave: false,
    saveUninitialized: true,
  })
);

// ========== CUSTOMER ROUTES ==========

// Homepage route for customers
app.get("/", (req, res) => {
  res.render("homepage.ejs");
});

// Customer registration route
app.get("/customers/registration", (req, res) => {
  res.render("customers-registration.ejs");
});

app.post("/customers/registration", async (req, res) => {
  const { email, password, full_name, phone_number } = req.body;

  // Check if the email already exists in customer table
  const checkCustomerEmailQuery = `SELECT * FROM customer WHERE customer_email = ?`;
  const checkRestaurantEmailQuery = `SELECT * FROM restaurants WHERE restaurant_email = ?`;

  global.db.get(checkCustomerEmailQuery, [email], async (err, customerData) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Error checking customer email.");
    }

    global.db.get(
      checkRestaurantEmailQuery,
      [email],
      async (err, restaurantData) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).send("Error checking restaurant email.");
        }

        // If the email already exists in either customer or restaurant tables
        if (customerData) {
          return res.send(`
          <script>
            alert("This email is already registered as a customer. Please use a different email.");
            window.location.href = "/customers/registration";
          </script>
        `);
        } else if (restaurantData) {
          return res.send(`
          <script>
            alert("This email is already registered as a restaurant. Please use a different email.");
            window.location.href = "/customers/registration";
          </script>
        `);
        } else {
          // Hash the password before storing it
          const hashedPassword = await bcrypt.hash(password, 10);

          // Insert customer data into the customer table
          const insertQuery = `INSERT INTO customer (customer_email, customer_password, customer_name, customer_phone_number) VALUES (?, ?, ?, ?)`;

          global.db.run(
            insertQuery,
            [email, hashedPassword, full_name, phone_number],
            function (err) {
              if (err) {
                console.error(
                  "Database error during customer registration:",
                  err
                );
                return res.status(500).send("Error during registration.");
              }
              res.redirect("/customers/sign-in"); // Redirect to login page after registration
            }
          );
        }
      }
    );
  });
});

// Customer Sign-In Route (GET)
app.get("/customers/sign-in", (req, res) => {
  res.render("customers-sign-in.ejs"); // 고객 로그인 폼을 렌더링
});

// Handle customer login form submission
app.post("/customers/sign-in", async (req, res) => {
  const { email, password } = req.body;

  const query = `SELECT * FROM customer WHERE customer_email = ?`;

  global.db.get(query, [email], async (err, customerData) => {
    if (err) {
      console.error("Database error during login:", err);
      return res.status(500).send("There is an error during login.");
    }

    if (customerData) {
      const isPasswordValid = await bcrypt.compare(
        password,
        customerData.customer_password
      );
      if (isPasswordValid) {
        req.session.customer_id = customerData.customer_id;
        req.session.customer_name = customerData.customer_name;
        return res.redirect("/customers/account"); // Redirect to customer account page
      } else {
        return res.send(`
              <script>
                alert("Invalid email or password.");
                window.location.href = "/customers/sign-in";
              </script>
            `);
      }
    } else {
      return res.send(`
            <script>
              alert("Invalid email or password.");
              window.location.href = "/customers/sign-in";
            </script>
          `);
    }
  });
});

// Customer account page (protected route)
app.get("/customers/account", (req, res) => {
  if (!req.session.customer_id) {
    return res.redirect("/customers/sign-in"); // Redirect to login page if not logged in
  }

  const query = `SELECT * FROM customer WHERE customer_id = ?`;

  global.db.get(query, [req.session.customer_id], (err, customerData) => {
    if (err) {
      console.error("Database error during account retrieval:", err);
      return res
        .status(500)
        .send("There is an error during account retrieval.");
    }

    if (customerData) {
      res.render("customers-account", { customer: customerData });
    } else {
      res.status(404).send("Customer not found.");
    }
  });
});

// Customer logout route
app.get("/customers/sign-out", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during session destruction:", err);
      return res.status(500).send("Error logging out.");
    }
    res.redirect("/customers/sign-in"); // Redirect to login page after logout
  });
});

// ========== RESTAURANT ROUTES ==========

// Restaurant registration route
app.get("/restaurants/registration", (req, res) => {
  res.render("restaurants-registration.ejs");
});

// Handle restaurant registration form submission
app.post("/restaurants/registration", async (req, res) => {
  const { email, password, restaurant_name } = req.body;

  // Check if the email already exists in restaurant table or customer table
  const checkCustomerEmailQuery = `SELECT * FROM customer WHERE customer_email = ?`;
  const checkRestaurantEmailQuery = `SELECT * FROM restaurants WHERE restaurant_email = ?`;

  global.db.get(checkCustomerEmailQuery, [email], async (err, customerData) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).send("Error checking customer email.");
    }

    global.db.get(
      checkRestaurantEmailQuery,
      [email],
      async (err, restaurantData) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).send("Error checking restaurant email.");
        }

        // If the email already exists in either customer or restaurant tables
        if (customerData) {
          return res.send(`
          <script>
            alert("This email is already registered as a customer. Please use a different email.");
            window.location.href = "/restaurants/registration";
          </script>
        `);
        } else if (restaurantData) {
          return res.send(`
          <script>
            alert("This email is already registered as a restaurant. Please use a different email.");
            window.location.href = "/restaurants/registration";
          </script>
        `);
        } else {
          // Hash the password before storing it
          const hashedPassword = await bcrypt.hash(password, 10);

          // Insert restaurant data into the restaurant table
          const insertQuery = `INSERT INTO restaurants (restaurant_email, restaurant_password, restaurant_name) VALUES (?, ?, ?)`;

          global.db.run(
            insertQuery,
            [email, hashedPassword, restaurant_name],
            function (err) {
              if (err) {
                console.error(
                  "Database error during restaurant registration:",
                  err
                );
                return res.status(500).send("Error during registration.");
              }
              res.redirect("/restaurants/sign-in"); // Redirect to login page after registration
            }
          );
        }
      }
    );
  });
});

// Restaurant Sign-In Route (GET)
app.get("/restaurants/sign-in", (req, res) => {
  res.render("restaurants-sign-in.ejs"); // Render login form
});

// Restaurant Sign-In Route (POST)
app.post("/restaurants/sign-in", async (req, res) => {
  const { email, password } = req.body;

  const query = `SELECT * FROM restaurants WHERE restaurant_email = ?`;

  global.db.get(query, [email], async (err, restaurantData) => {
    if (err) {
      console.error("Database error during restaurant login:", err);
      return res.status(500).send("There is an error during login.");
    }

    if (restaurantData) {
      const isPasswordValid = await bcrypt.compare(
        password,
        restaurantData.restaurant_password
      );
      if (isPasswordValid) {
        req.session.restaurant_id = restaurantData.restaurant_id;
        req.session.restaurant_name = restaurantData.restaurant_name;
        return res.redirect("/restaurants/account"); // Redirect to restaurant account page
      } else {
        return res.send(`
              <script>
                alert("Invalid email or password.");
                window.location.href = "/restaurants/sign-in";
              </script>
            `);
      }
    } else {
      return res.send(`
            <script>
              alert("Invalid email or password.");
              window.location.href = "/restaurants/sign-in";
            </script>
          `);
    }
  });
});

// Restaurant account page (protected route)
app.get("/restaurants/account", (req, res) => {
  if (!req.session.restaurant_id) {
    return res.redirect("/restaurants/sign-in"); // Redirect to login page if not logged in
  }

  const query = `SELECT * FROM restaurants WHERE restaurant_id = ?`;

  global.db.get(query, [req.session.restaurant_id], (err, restaurantData) => {
    if (err) {
      console.error("Database error during account retrieval:", err);
      return res
        .status(500)
        .send("There is an error during account retrieval.");
    }

    if (restaurantData) {
      res.render("restaurants-account", { restaurant: restaurantData });
    } else {
      res.status(404).send("Restaurant not found.");
    }
  });
});

// Restaurant logout route
app.get("/restaurants/sign-out", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during session destruction:", err);
      return res.status(500).send("Error logging out.");
    }
    res.redirect("/restaurants/sign-in"); // Redirect to login page after logout
  });
});

// Start Server
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
