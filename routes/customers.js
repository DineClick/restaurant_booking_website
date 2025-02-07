const express = require("express");
const router = express.Router();

// For hashing passwords
const bcrypt = require("bcrypt");

//For image upload and delete
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 

//Set the Storage for Customer-related Images Destination and Filename Format Using multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Save Files in the public/customers-images directory
        cb(null, path.join(__dirname, '../public/customers-images'));
    },
    filename: function (req, file, cb) {
        // Use the original filename or add a timestamp to avoid filename collisions
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({storage: storage});

// homepage before sign in
router.get("/", (req, res) => {
    res.render("homepage.ejs");
})

// homepage after sign in
router.get("/homepage", (req, res) => {
    res.render("customers-homepage");
})

// about page before sign in
router.get("/about", (req, res) => {
    res.render("about.ejs");
})

// about page after sign in
router.get("/about-us", (req, res) => {
    res.render("customers-about.ejs"); 
})

// Customer Sign In page 
router.get("/sign-in", (req, res) => {
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
    res.render("customers-registration.ejs")
})

// Handling customer registration
router.post("/registration", upload.single('customer_image'), async (req, res) => {
    const { full_name, email, phone_number, password } = req.body;

    // Check if the image was uploaded
    if(!req.file){
        return res.send(`
            <script>
                alert("Please upload a profile picture.");
                window.location.href = "/customers/registration";
            </script>`);
    }

    // Store image path in the database
    const customerImgPath = "/customers-images/" + req.file.filename; 

    const checkCustomerEmailQuery = "SELECT * FROM customer WHERE customer_email = ?";
    const checkRestaurantEmailQuery = "SELECT * FROM restaurant WHERE restaurant_email = ?";

    // Check if the email is already registered as a restaurant or customer (one email only belong to one type of user (restaurant or customer))
    global.db.get(checkRestaurantEmailQuery, [email], async (err, restaurantData) => {
        if (err) {
            console.error("Database error during insertion:", err);
            return res.send(`
                <script>
                    alert("Error: Internal Server Error. Please try again later.");
                    window.location.href = "/customers/registration";
                </script>`);
        }

        global.db.get(checkCustomerEmailQuery, [email], async (err, customerData) => {
            if (err) {
                console.error("Database error during insertion:", err);
                return res.send(`
                    <script>
                        alert("Error: Internal Server Error. Please try again later.");
                        window.location.href = "/customers/registration";
                    </script>`);
            }
    
            if(restaurantData){
                return res.send(`
                    <script>
                        alert("Error: This email is already registered as a restaurant. Please use a different email");
                        window.location.href = "/customers/registration";
                    </script>`);
            } else if (customerData){
                return res.send(`
                    <script>
                        alert("Error: This email is already registered as a customer. Please use a different email");
                        window.location.href = "/customers/registration";
                    </script>`);
            // If the email is not registered as a restaurant or customer, hash the password and insert the new customer data 
            } else {
                bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
                    if (hashErr) {
                        console.error("Error hashing password:", hashErr);
                        return res.send(`
                            <script>
                                alert("Error: Internal Server Error. Please try again later.");
                                window.location.href = "/customers/registration";
                            </script>`);
                    }
    
                    // insert new customer data with the hashed password
                    const insertQuery = `INSERT INTO customer (customer_name, customer_email, customer_phone_number, customer_password, customer_image) VALUES (?, ?, ?, ?, ?)`;
                    global.db.run(insertQuery, [full_name, email, phone_number, hashedPassword, customerImgPath], (err) => {
                        if (err) { // 쿼리 실행 중 오류 발생 시
                            console.error("Error inserting customer data:", err);
                            return res.send(`
                                <script>
                                    alert("Error: Internal Server Error. Please try again later.");
                                    window.location.href = "/customers/registration";
                                </script>`);
                        }
                        // 성공적으로 등록되었을 때
                        res.send(`
                            <script>
                                alert("Registration successful. Please sign in to continue."); 
                                window.location.href = "/customers/sign-in";
                            </script>`)
                    })
                })            
            }
        })
    })
});

// Customer Account page
router.get("/account", (req, res, next) => {
    customerID = req.session.customer_id;

    //Define the query for Customer Account Data
    customerAccountQuery = "SELECT * FROM customer WHERE customer_id = ?";
                    
    //Execute the query and render the page with the results
    global.db.all(customerAccountQuery, [customerID], (err, customerAccountResult) => {
        if (err) {
            console.error("Database error (Customer):", err);
            return res.send(`
                <script>
                    alert("Internal Server Error");
                    window.location.href = "/customers/account";
                    </script>`);
        } else {
            customer_data = customerAccountResult[0];
            res.render("customers-account.ejs", {customer_data: customer_data});
        }
    });  
})

router.post("/account", upload.single('customer_image'), (req, res, next) => { 
    customerID = req.session.customer_id;  
    const buttonClicked = req.body.submitButton;

    if (buttonClicked === "updateCustomerAccount") {
        //Define the query to Update Customer Account
        updateCustomerAccount = [req.body.customer_name, req.body.customer_email, req.body.customer_phone_number, req.body.customer_password, customerID];
        updateCustomerAccountQuery = "UPDATE customer SET customer_name = ?, customer_email = ?, customer_phone_number = ?, customer_password = ? WHERE customer_id = ?";

        //Execute the query and render the page with the results
        global.db.run(updateCustomerAccountQuery, updateCustomerAccount, (err) => {
            if (err) {
                return res.send(`
                    <script>
                        alert("Update Failed");
                        window.location.href = "/customers/account";
                    </script>
                `);
            } else {
                res.redirect("/customers/account");
            }
        });
    } else if (buttonClicked === "deleteCustomerAccount") {
        //Define the query to Delete Customer Account
        deleteCustomerAccountQuery = "DELETE FROM customer WHERE customer_id = ?";

        //Execute the query and render the page with the results
        global.db.run(deleteCustomerAccountQuery, [customerID], (err) => {
            if (err) {
                return res.send(`
                    <script>
                        alert("Delete Failed");
                        window.location.href = "/customers/account";
                    </script>
                `);
            } else {
                res.redirect("/customers/");
            }
        });
    } else if (buttonClicked === "updateCustomerImage") {
        //Define the query for Customer Account Data
        customerAccountQuery = "SELECT * FROM customer WHERE customer_id = ?";
                
        //Execute the query and render the page with the results
        global.db.all(customerAccountQuery, [customerID], (err, customerAccountResult) => {
            if (err) {
                console.error("Database error (Customer):", err);
                return res.send(`
                    <script>
                        alert("Internal Server Error - Update Image Failed");
                        window.location.href = "/customers/account";
                    </script>`);
            } else {
                //Delete Previous Image
                prevCustomerImage = "public/" + customerAccountResult[0].customer_image;
                console.log(prevCustomerImage);
                fs.unlink(prevCustomerImage, (err) => {
                    //Define the query to Update New Customer Image
                    customerImagePath = "/customers-images/" + req.file.filename;
                    updateCustomerImage = [customerImagePath, customerID]
                    updateCustomerImageQuery = "UPDATE customer SET customer_image = ? WHERE customer_id = ?";
            
                    //Execute the query and render the page with the results
                    global.db.run(updateCustomerImageQuery, updateCustomerImage, (err) => {
                        if (err) {
                            return res.send(`
                                <script>
                                    alert("Update New Image Failed");
                                    window.location.href = "/customers/account";
                                </script>
                            `);
                        } else {
                            res.redirect("/customers/account");
                        }
                    });
                });
            }
        });
    }
})

router.get("/list", (req, res) => {
    // res.render("restaurant-listing.ejs");
    res.send("List of restaurants (customers)");
})

// Customer logout route
router.get("/sign-out", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error during session destruction:", err);
        return res.status(500).send("Error logging out.");
      }
      res.redirect("/customers/sign-in"); // Redirect to login page after logout
    });
  });

// Export the router object so index.js can access it
module.exports = router;
