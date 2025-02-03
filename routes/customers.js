const express = require("express");
const router = express.Router();

// For hashing passwords
const bcrypt = require("bcrypt");

router.get("/", (req, res) => {
    res.render("customers-homepage");
})

// Customer Sign In page 
router.get("/sign-in", (req, res) => {
    // res.send("Customer Sign In Page");
    res.render("customers-sign-in.ejs")
})

router.post("/sign-in", (req, res) => {
    // check the email and password against the database
    const {email, password} = req.body; 

    // Query to validate the customer credentials
    const customerSignInQuery = "SELECT * FROM customer WHERE customer_email = ?";

    global.db.get(customerSignInQuery, [email], async (err, customerData) =>{
        if(err){
            console.error("Database error (Customer):", err);
            return res.send(`
                <script>
                    alert("Internal Server Error");
                    window.location.href = "/customers/sign-in";
                    </script>`);
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
    })
})

// Customer Registration page (Sign up)
router.get("/registration", (req, res) => {
    // res.send("Customer Registration Page");
    res.render("customers-registration.ejs")
})

// Customer Account page (show all information about the customer)
router.get("/account", (req, res) => {
    res.send("Customer Account Page");
    // res.render("customers-account.ejs")
})

// Customer List of Restaurant Page
router.get("/list", (req, res) => {
    //Define the query for List of Restaurants
    const restaurantListQuery = "SELECT * FROM restaurant";

    //Execute the query and render the page with the results
    global.db.all(restaurantListQuery, (err, restaurantListResult) => {
        if (err) {
            next(err);
        } else {
            //Get the Searched Keywords
            if (req.query.searchedKeywords) {
                const keywords = req.query.searchedKeywords.toLowerCase(); 
                const restaurantList = restaurantListResult.filter(restaurant => restaurant.restaurant_name.toLowerCase().includes(keywords));
                res.render("customers-list.ejs", {restaurant_list: restaurantList});
            } else {
                res.render("customers-list.ejs", {restaurant_list: restaurantListResult});
            } 
        }
    })
})

router.post("/list", (req, res) => {
    const restaurantID = req.body.bookRestaurant;
    res.redirect("/customers/");
    //should render restaurant details page
    //res.render("");
})

// Export the router object so index.js can access it
module.exports = router;
