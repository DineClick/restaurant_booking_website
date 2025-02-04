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

// Export the router object so index.js can access it
module.exports = router;
