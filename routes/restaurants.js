const express = require("express");
const router = express.Router();

// For hashing passwords
const bcrypt = require("bcrypt");

//For image upload and delete
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Save Files in the public/customers-images directory
        cb(null, path.join(__dirname, '../public/restaurants-images'));
    },
    filename: function (req, file, cb) {
        // Use the original filename or add a timestamp to avoid filename collisions
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({storage: storage});

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
    res.render("restaurants-sign-in.ejs")
})

router.post('/sign-in', async (req, res) => {
    const { email, password } = req.body;

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

// 4. Restaurant Registration page (Sign up)
router.get("/registration", (req, res) => {
    res.render("restaurants-registration.ejs")
})

router.post("/registration", upload.single('restaurant_image'), async (req, res) => {
    const {restaurant_name, email, restaurant_phone_number, restaurant_address, password, restaurant_description } = req.body;
    
    // Check if the image was uploaded
    if(!req.file){
        return res.send(`
            <script>
                alert("Please upload a profile picture.");
                window.location.href = "/restaurants/registration";
            </script>`);
    }

    // Store the image path to the database
    const restaurantImgPath = "/restaurants-images/" + req.file.filename; 

    const checkCustomerEmailQuery = "SELECT * FROM customer WHERE customer_email = ?";
    const checkRestaurantEmailQuery = "SELECT * FROM restaurant WHERE restaurant_email = ?";

    global.db.get(checkCustomerEmailQuery, [email], async (err, customerData) => {
        if (err) {
            console.error("Database error during insertion:", err);
            return res.send(`
                <script>
                    alert("Error: Internal Server Error. Please try again later.");
                    window.location.href = "/restaurants/registration";
                </script>`);
        }

        global.db.get(checkRestaurantEmailQuery, [email], async (err, restaurantData) => {
            if (err) {
                console.error("Database error during insertion:", err);
                return res.send(`
                    <script>
                        alert("Error: Internal Server Error. Please try again later.");
                        window.location.href = "/restaurants/registration";
                    </script>`);
            }
    
            if(customerData){
                return res.send(`
                    <script>
                        alert("Error: This email is already registered as a customer. Please use a different email");
                        window.location.href = "/restaurants/registration";
                    </script>`);
            } else if (restaurantData){
                return res.send(`
                    <script>
                        alert("Error: This email is already registered as a restaurant. Please use a different email");
                        window.location.href = "/restaurants/registration";
                    </script>`);
            // If the email is not registered as a customer or restaurant, hash the password and insert the new restaurant data
            } else {
                bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
                    if (hashErr) {
                        console.error("Error hashing password:", hashErr);
                        return res.send(`
                            <script>
                                alert("Error: Internal Server Error. Please try again later.");
                                window.location.href = "/restaurants/registration";
                            </script>`);
                    }
    
                    // insert new customer data with the hashed password
                    const insertQuery = `INSERT INTO restaurant (restaurant_name, restaurant_email, restaurant_phone_number, restaurant_address,restaurant_password, restaurant_description, restaurant_image) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    global.db.run(insertQuery, [restaurant_name, email, restaurant_phone_number, restaurant_address, hashedPassword, restaurant_description, restaurantImgPath], (err) => {
                        if (err) { // 쿼리 실행 중 오류 발생 시
                            console.error("Error inserting restaurant data:", err);
                            return res.send(`
                                <script>
                                    alert("Error: Internal Server Error. Please try again later.");
                                    window.location.href = "/restaurants/registration";
                                </script>`);
                        }
                        // 성공적으로 등록되었을 때
                        res.send(`
                            <script>
                                alert("Registration successful. Please sign in to continue."); 
                                window.location.href = "/restaurants/sign-in";
                            </script>`)
                    })
                })            
            }
        })
    })
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
