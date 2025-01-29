const express = require("express");
const router = express.Router();

// For hashing passwords
const bcrypt = require("bcrypt");


// 1. Restaurant Homepage after login (Sign in change to account)
router.get("/", (req, res) => {
    res.render("homepage.ejs");
})

// 2. About page
router.get("/about", (req, res) => {
    res.render("about.ejs")
})

// 3. Restaurant Sign In page 
router.get("/sign-in", (req, res) => {
    // res.send("Restaurant Sign In Page");
    res.render("sign-in.ejs")
})

router.post('/sign-in', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Step 1: Check the Customer table
        const customerSignInQuery = `SELECT * FROM customer WHERE customer_email = ?`;
        global.db.get(customerSignInQuery, [email], async (err, customerData) => {
            if (err) {
                console.error('Database error (Customer):', err);
                return res.send(`
                    <script>
                        alert("Internal Server Error");
                        window.location.href = "/restaurants/sign-in";
                    </script>
                `);
            }

            if (customerData) {
                // Validate customer password
                const isCustomerPasswordValid = await bcrypt.compare(password, customerData.customer_password);
                if (isCustomerPasswordValid) {
                    // Login successful for Customer
                    req.session.customer_id = customerData.customer_id;
                    req.session.customer_name = customerData.customer_name;
                    return res.redirect('/customers/account');
                } else {
                    // Invalid password for Customer
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
            global.db.get(restaurantSignInQuery, [email], async (err, restaurantData) => {
                if (err) {
                    console.error('Database error (Restaurant):', err);
                    return res.send(`
                        <script>
                            alert("Internal Server Error");
                            window.location.href = "/restaurants/sign-in";
                        </script>
                    `);
                }

                if (restaurantData) {
                    // Validate restaurant password
                    const isRestaurantPasswordValid = await bcrypt.compare(password, restaurantData.restaurant_password);
                    if (isRestaurantPasswordValid) {
                        // Login successful for Restaurant
                        req.session.restaurant_id = restaurantData.restaurant_id;
                        req.session.restaurant_name = restaurantData.restaurant_name;
                        return res.redirect('/restaurants/account');
                    } else {
                        // Invalid password for Restaurant
                        return res.send(`
                            <script>
                                alert("Invalid email or password.");
                                window.location.href = "/restaurants/sign-in";
                            </script>
                        `);
                    }
                }

                // If no match found in either table
                return res.send(`
                    <script>
                        alert("Invalid email or password.");
                        window.location.href = "/restaurants/sign-in";
                    </script>
                `);
            });
        });
    } catch (error) {
        console.error('Sign-In error:', error);
        return res.status(500).send(`
            <script>
                alert("Internal Server Error");
                window.location.href = "/restaurants/sign-in";
            </script>
        `);
    }
});



// 4. Restaurant Registration page (Sign up)
router.get("/registration", (req, res) => {
    res.send("Restaurant Registration Page");
    // res.render("restaurants-registration.ejs")
})

// 5. Restaurant Account page (show all information about the restaurant)
// Need to implement when the restaurant want to update the information or delete the account
router.get("/account", (req, res) => {
    res.send("Restaurant Account Page");
    // res.render("restaurants-account.ejs")
})

// 4. list of the Restaurant (when click on restaurant button)
// book button cannot be clicked because is restaurant account
router.get("/list", (req, res) => {
    res.send("List of the Restaurant");
})

// Export the router object so index.js can access it
module.exports = router;
