const express = require("express");
const router = express.Router();

// For hashing passwords
const bcrypt = require("bcrypt");

// 1. Restaurant Homepage after login (Sign in change to account)
router.get("/", (req, res) => {
  res.render("homepage.ejs");
});

// 2. About page
router.get("/about", (req, res) => {
  res.render("about.ejs");
});

// 3. Restaurant Sign In page
router.get("/sign-in", (req, res) => {
  res.render("restaurant-sign-in.ejs");
});

router.post("/sign-in", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Step 1: Check the Customer table
    const customerSignInQuery = `SELECT * FROM customer WHERE customer_email = ?`;
    global.db.get(customerSignInQuery, [email], async (err, customerData) => {
      if (err) {
        console.error("Database error (Customer):", err);
        return res.send(`
                    <script>
                        alert("Internal Server Error");
                        window.location.href = "/restaurants/sign-in";
                    </script>
                `);
      }

      if (customerData) {
        const isCustomerPasswordValid = await bcrypt.compare(
          password,
          customerData.customer_password
        );
        if (isCustomerPasswordValid) {
          req.session.customer_id = customerData.customer_id;
          req.session.customer_name = customerData.customer_name;
          return res.redirect("/customers/account");
        } else {
          return res.send(`
                        <script>
                            alert("Invalid email or password.");
                            window.location.href = "/restaurants/sign-in";
                        </script>
                    `);
        }
      }

      // Check the Restaurant table if no match found in Customer table
      const restaurantSignInQuery = `SELECT * FROM restaurant WHERE restaurant_email = ?`;
      global.db.get(
        restaurantSignInQuery,
        [email],
        async (err, restaurantData) => {
          if (err) {
            console.error("Database error (Restaurant):", err);
            return res.send(`
                        <script>
                            alert("Internal Server Error");
                            window.location.href = "/restaurants/sign-in";
                        </script>
                    `);
          }

          if (restaurantData) {
            const isRestaurantPasswordValid = await bcrypt.compare(
              password,
              restaurantData.restaurant_password
            );
            if (isRestaurantPasswordValid) {
              req.session.restaurant_id = restaurantData.restaurant_id;
              req.session.restaurant_name = restaurantData.restaurant_name;
              return res.redirect("/restaurants/account");
            } else {
              return res.send(`
                            <script>
                                alert("Invalid email or password.");
                                window.location.href = "/restaurants/sign-in";
                            </script>
                        `);
            }
          }

          return res.send(`
                    <script>
                        alert("Invalid email or password.");
                        window.location.href = "/restaurants/sign-in";
                    </script>
                `);
        }
      );
    });
  } catch (error) {
    console.error("Sign-In error:", error);
    return res.status(500).send(`
            <script>
                alert("Internal Server Error");
                window.location.href = "/restaurants/sign-in";
            </script>
        `);
  }
});

// Restaurant Registration page (Sign up)
router.get("/registration", (req, res) => {
  res.render("restaurants-registration.ejs");
});

// Handling restaurant registration
router.post("/registration", async (req, res) => {
  const { email, password, restaurant_name } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertRestaurantQuery = `INSERT INTO restaurant (restaurant_email, restaurant_password, restaurant_name) VALUES (?, ?, ?)`;

    global.db.run(
      insertRestaurantQuery,
      [email, hashedPassword, restaurant_name],
      (err) => {
        if (err) {
          console.error("Database error:", err);
          return res.send(`
                    <script>
                        alert("Internal Server Error");
                        window.location.href = "/restaurants/registration";
                    </script>
                `);
        }

        res.redirect("/restaurants/sign-in");
      }
    );
  } catch (error) {
    console.error("Restaurant registration error:", error);
    res.status(500).send(`
            <script>
                alert("Internal Server Error");
                window.location.href = "/restaurants/registration";
            </script>
        `);
  }
});

// Restaurant Account page (for account details)
router.get("/account", (req, res) => {
  res.send("Restaurant Account Page");
});

// Export the router object so index.js can access it
module.exports = router;
