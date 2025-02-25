const express = require("express");
const router = express.Router();

// For hashing passwords
const bcrypt = require("bcrypt");

//For image upload and delete
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 

//Set the Storage for Restaurant-related Images Destination and Filename Format Using multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        //Save Files in the public/restaurants-images directory
        cb(null, path.join(__dirname, '../public/restaurants-images'));
    },
    filename: function (req, file, cb) {
        //Use the original filename or add a timestamp to avoid filename collisions
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({storage: storage});

// homepage before sign in
router.get("/", (req, res) => {
    res.render("homepage.ejs");
})

// Homepage after sign in
router.get("/homepage", (req, res) => {
    res.render("restaurants-homepage.ejs");
})

// About page before sign in
router.get("/about", (req, res) => {
    res.render("about.ejs")
})

// About page after sign in
router.get("/about-us", (req, res) => {
    res.render("restaurants-about.ejs")
})

// 3. Restaurant Sign In page 
router.get("/sign-in", (req, res) => {
    // res.send("Restaurant Sign In Page");
    res.render("restaurants-sign-in.ejs")
})

/* The data inputted in the sign in form will be compared with the data in the database, 
   if the email and password match, the restaurant will be redirected to the restaurant account page.
   If the email and password do not match, the restaurant will be redirected to the sign in page with an alert message.
   It will redirect back to the sign in page after user clicks the "OK" button in the alert message.
*/
router.post('/sign-in', async (req, res) => {
    const { email, password } = req.body;

    const restaurantSignInQuery = `SELECT * FROM restaurant WHERE restaurant_email = ?`;
    global.db.get(restaurantSignInQuery, [email], async (err, restaurantData) => {
        if (err) {
            console.error('Database error (Restaurant):', err);
            return res.render("restaurants-sign-in.ejs", {
                alertMessage: "Internal Server Error"
            });
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
                return res.render("restaurants-sign-in.ejs", {
                    alertMessage: "Invalid email or password."
                });
            }
        } else {
            return res.render("restaurants-sign-in.ejs", {
                alertMessage: "Invalid email or password."
            });
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
        return res.render("restaurants-registration.ejs", {
            alertMessage: "Please upload a profile picture."
        });
    }

    // Store the image path to the database
    const restaurantImgPath = "/restaurants-images/" + req.file.filename; 

    const checkCustomerEmailQuery = "SELECT * FROM customer WHERE customer_email = ?";
    const checkRestaurantEmailQuery = "SELECT * FROM restaurant WHERE restaurant_email = ?";

    global.db.get(checkCustomerEmailQuery, [email], async (err, customerData) => {
        if (err) {
            console.error("Database error during insertion:", err);
            return res.render("restaurants-registration.ejs", {
                alertMessage: "Internal Server Error. Please try again later."
            });
        }

        global.db.get(checkRestaurantEmailQuery, [email], async (err, restaurantData) => {
            if (err) {
                console.error("Database error during insertion:", err);
                return res.render("restaurants-registration.ejs", {
                    alertMessage: "Internal Server Error. Please try again later."
                });
            }
    
            if(customerData){
                return res.render("restaurants-registration.ejs", {
                    alertMessage: "Error: This email is already registered as a customer. Please use a different email"
                });

            } else if (restaurantData){
                return res.render("restaurants-registration.ejs", {
                    alertMessage: "Error: This email is already registered as a restaurant. Please use a different email"
                });

            // If the email is not registered as a customer or restaurant, hash the password and insert the new restaurant data
            } else {
                bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
                    if (hashErr) {
                        console.error("Error hashing password:", hashErr);
                        return res.render("restaurants-registration.ejs", {
                            alertMessage: "Internal Server Error. Please try again later."
                        });
                    }
    
                    // insert new customer data with the hashed password
                    const insertQuery = `INSERT INTO restaurant (restaurant_name, restaurant_email, restaurant_phone_number, restaurant_address,restaurant_password, restaurant_description, restaurant_image) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                    global.db.run(insertQuery, [restaurant_name, email, restaurant_phone_number, restaurant_address, hashedPassword, restaurant_description, restaurantImgPath], (err) => {
                        if (err) { 
                            console.error("Error inserting restaurant data:", err);
                            return res.render("restaurants-registration.ejs", {
                                alertMessage: "Internal Server Error. Please try again later."
                            });
                        }
                        
                        return res.render("restaurants-sign-in.ejs", {
                            alertMessage: "Registration successful. Please sign in to continue."
                        });
                    })
                })            
            }
        })
    })
})

// 5. Restaurant Account page
router.get("/account", (req, res) => {
    restaurantID = req.session.restaurant_id;

    //Define the query for Restaurant Account Data
    restaurantAccountQuery = "SELECT * FROM restaurant WHERE restaurant_id = ?";
                    
    //Execute the query and render the page with the results
    global.db.all(restaurantAccountQuery, [restaurantID], (err, restaurantAccountResult) => {
        if (err) {
            console.error("Database error (Restaurant):", err);
            return res.render("restaurants-account.ejs", {
                alertMessage: "Internal Server Error"
            });
        } else {
            restaurant_data = restaurantAccountResult[0];

            //Define the query for Menu List
            menuListQuery = "SELECT * FROM menu_list WHERE restaurant_id = ?";
                                    
            //Execute the query and render the page with the results
            global.db.all(menuListQuery, [restaurantID], (err, menuListResult) => {
                if (err) {
                    console.error("Database error (Restaurant - Menu):", err);
                    return res.render("restaurants-account.ejs", {
                        alertMessage: "Internal Server Error"
                    });
                } else {
                    res.render("restaurants-account.ejs", {restaurant_data: restaurant_data, menu_list: menuListResult});
                }
            });
        }
    })
})

router.post("/account", upload.fields([{name: 'restaurant_image'}, {name: 'restaurant_floorplan_image'}]), (req, res, next) => {
    restaurantID = req.session.restaurant_id;
    const buttonClicked = req.body.submitButton;

    if (buttonClicked === "updateRestaurantAccount") {
        //Define the query to Update Restaurant Account
        updateRestaurantAccount = [req.body.restaurant_name, req.body.restaurant_email, req.body.restaurant_phone_number, req.body.restaurant_address, req.body.restaurant_password, req.body.restaurant_description, restaurantID];
        updateRestaurantAccountQuery = "UPDATE restaurant SET restaurant_name = ?, restaurant_email = ?, restaurant_phone_number = ?, restaurant_address = ?, restaurant_password = ?, restaurant_description = ? WHERE restaurant_id = ?";

        //Execute the query and render the page with the results
        global.db.run(updateRestaurantAccountQuery, updateRestaurantAccount, (err) => {
            if (err) {
                return res.render("restaurants-account.ejs", {
                    alertMessage: "Update Failed"
                });
            } else {
                res.redirect("/restaurants/account");
            }
        });
    } else if (buttonClicked === "deleteRestaurantAccount") {
        //Define the query to Delete Restaurant Account
        deleteRestaurantAccountQuery = "DELETE FROM restaurant WHERE restaurant_id = ?";

        //Execute the query and render the page with the results
        global.db.run(deleteRestaurantAccountQuery, [restaurantID], (err) => {
            if (err) {
                return res.render("restaurants-account.ejs", {
                    alertMessage: "Delete Failed"
                });
            } else {
                res.redirect("/restaurants/homepage");
            }
        });
    } else if (buttonClicked === "updateRestaurantImage") {
        //Define the query for Restaurant Account Data
        restaurantAccountQuery = "SELECT * FROM restaurant WHERE restaurant_id = ?";
        
        //Execute the query and render the page with the results
        global.db.all(restaurantAccountQuery, [restaurantID], (err, restaurantAccountResult) => {
            if (err) {
                console.error("Database error (Restaurant - Update Profile Picture):", err);
                return res.render("restaurants-account.ejs", {
                    alertMessage: "Internal Server Error"
                });
            } else {
                //Delete Previous Image
                prevRestaurantImage = "public/" + restaurantAccountResult[0].restaurant_image;

                fs.unlink(prevRestaurantImage, (err) => {
                    //Define the query to Upload New Restaurant Image
                    restaurantImagePath = "/restaurants-images/" + req.files['restaurant_image'][0].filename;
                    updateRestaurantImage = [restaurantImagePath, restaurantID]
                    updateRestaurantImageQuery = "UPDATE restaurant SET restaurant_image = ? WHERE restaurant_id = ?";

                    //Execute the query and render the page with the results
                    global.db.run(updateRestaurantImageQuery, updateRestaurantImage, (err) => {
                        if (err) {
                            return res.render("restaurants-account.ejs", {
                                alertMessage: "Update New Profile Picture Failed"
                            });
                        } else {
                            res.redirect("/restaurants/account");
                        }
                    });
                });
            }
        });
    } else if (buttonClicked === "updateFloorplanImage") {
        //Define the query for Restaurant Account Data
        restaurantAccountQuery = "SELECT * FROM restaurant WHERE restaurant_id = ?";
        
        //Execute the query and render the page with the results
        global.db.all(restaurantAccountQuery, [restaurantID], (err, restaurantAccountResult) => {
            if (err) {
                console.error("Database error (Restaurant - Update Floorplan Image):", err);
                return res.render("restaurants-account.ejs", {
                    alertMessage: "Internal Server Error"
                });
            } else {
                //Delete Previous Image
                prevFloorplanImage = "public/" + restaurantAccountResult[0].restaurant_floorplan_image;

                fs.unlink(prevFloorplanImage, (err) => {
                    //Define the query to Upload New Restaurant Image
                    floorplanImagePath = "/restaurants-images/" + req.files['restaurant_floorplan_image'][0].filename;
                    updateFloorplanImage = [floorplanImagePath, restaurantID]
                    updateFloorplanImageQuery = "UPDATE restaurant SET restaurant_floorplan_image = ? WHERE restaurant_id = ?";

                    //Execute the query and render the page with the results
                    global.db.run(updateFloorplanImageQuery, updateFloorplanImage, (err) => {
                        if (err) {
                            return res.render("restaurants-account.ejs", {
                                alertMessage: "Update New Floorplan Image Failed"
                            });
                        } else {
                            res.redirect("/restaurants/account");
                        }
                    });
                });
            }
        });
    }
})

// 6. Restaurant Edit Menu page
router.get("/edit-menu", (req, res) => {
    restaurantID = req.session.restaurant_id;

    //Define the query for Menu List
    menuListQuery = "SELECT * FROM menu_list WHERE restaurant_id = ?";
                    
    //Execute the query and render the page with the results
    global.db.all(menuListQuery, [restaurantID], (err, menuListResult) => {
        if (err) {
            console.error("Database error (Menu List):", err);
            return res.render("restaurants-edit-menu.ejs", {
                alertMessage: "Internal Server Error"
            });
        } else {
            res.render("restaurants-edit-menu.ejs", {menu_list: menuListResult});
        }
    });
})

router.post("/edit-menu", upload.single('menu_image'), (req, res, next) => {
    restaurantID = req.session.restaurant_id;
    const buttonClicked = req.body.submitButton;

    if (buttonClicked.includes("addMenu")) {
        //Define the query for Add Menu
        addMenu = [restaurantID, req.body.menu_name]
        addMenuQuery = "INSERT INTO menu_list (restaurant_id, menu_name) VALUES (?,?)";

        global.db.run(addMenuQuery, addMenu, (err, next) => {
            if (err) {
                return res.render("restaurants-edit-menu.ejs", {
                    alertMessage: "Add Failed"
                });
            } else { 
                res.redirect("/restaurants/edit-menu");
            }
        })
    } else if (buttonClicked.includes("updateImage")) {
        //Get Menu ID 
        menuData = buttonClicked.match(/(\d+)/);
        menuID = menuData[0];

        //Define the query for Menu
        menuQuery = "SELECT * FROM menu_list WHERE menu_id = ?";
        
        //Execute the query and render the page with the results
        global.db.all(menuQuery, [menuID], (err, menuResult) => {
            if (err) {
                console.error("Database error (Update Image - Menu List):", err);
                return res.render("restaurants-edit-menu.ejs", {
                    alertMessage: "Internal Server Error"
                });

            } else {
                //Delete Previous Image
                prevMenuImage = "public/" + menuResult[0].menu_image;

                fs.unlink(prevMenuImage, (err) => {
                    //Define the query to Upload New Menu Image
                    menuImagePath = "/restaurants-images/" + req.file.filename;
                    uploadMenuImage = [menuImagePath, menuID]
                    uploadMenuImageQuery = "UPDATE menu_list SET menu_image = ? WHERE menu_id = ?";

                    //Execute the query and render the page with the results
                    global.db.run(uploadMenuImageQuery, uploadMenuImage, (err) => {
                        if (err) {
                            return res.render("restaurants-edit-menu.ejs", {
                                alertMessage: "Update New Menu Image Failed"
                            });
                        } else {
                            res.redirect("/restaurants/edit-menu");
                        }
                    });
                });
            }
        });
    } else if (buttonClicked.includes("deleteMenu")) {
        //Get Menu ID 
        menuData = buttonClicked.match(/(\d+)/);
        menuID = menuData[0];

        //Define the query to Delete Restaurant Account
        deleteMenuQuery = "DELETE FROM menu_list WHERE menu_id = ?";

        //Execute the query and render the page with the results
        global.db.run(deleteMenuQuery, [menuID], (err) => {
            if (err) {
                return res.render("restaurants-edit-menu.ejs", {
                    alertMessage: "Delete Failed"
                });
            } else {
                res.redirect("/restaurants/edit-menu");
            }
        });
    }
})

// 7. list of the Restaurant (when click on restaurant button)
// book button cannot be clicked because is restaurant account
router.get("/search", (req, res) => {
    //Define the query for List of Restaurants
    restaurantListQuery = "SELECT * FROM restaurant";

    //Execute the query and render the page with the results
    global.db.all(restaurantListQuery, (err, restaurantListResult) => {
        if (err) {
            next(err);
        } else {
            //Get the Searched Keywords
            if (req.query.searchedKeywords) {
                keywords = req.query.searchedKeywords.toLowerCase(); 
                restaurantList = restaurantListResult.filter(restaurant => restaurant.restaurant_name.toLowerCase().includes(keywords));
                res.render("restaurants-list-restaurants.ejs", {restaurant_list: restaurantList});
            } else {
                res.render("restaurants-list-restaurants.ejs", {restaurant_list: restaurantListResult});
            } 
        }
    })
})

router.get("/list", (req, res) => {
    restaurantList = "SELECT * FROM restaurant";    

    global.db.all(restaurantList, (err, restaurants) => {
        if (err){
            return res.render("restaurants-list-restaurants.ejs", {
                alertMessage: "Internal Server Error"
            });
        }
        res.render("restaurants-list-restaurants.ejs", {restaurant_list: restaurants});
    });
})

// Restaurant logout route
router.get("/sign-out", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error during session destruction:", err);
        return res.status(500).send("Error logging out.");
      }
      res.redirect("/restaurants"); // Redirect to login page after logout
    });
  });

  router.get("/book", (req, res) => {
    res.send("Booking page"); 
  })

// Export the router object so index.js can access it
module.exports = router;
