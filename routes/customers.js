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

/* The data inputted in the sign in form will be compared with the data in the database, 
   if the email and password match, the customer will be redirected to the customer account page.
   If the email and password do not match, the customer will be redirected to the sign in page with an alert message.
   It will redirect back to the sign in page after user clicks the "OK" button in the alert message.
*/
router.post("/sign-in", (req, res) => {
    // check the email and password against the database
    const {email, password} = req.body; 

    // Query to validate the customer credentials
    const customerSignInQuery = "SELECT * FROM customer WHERE customer_email = ?";

    global.db.get(customerSignInQuery, [email], async (err, customerData) =>{
        if(err){
            console.error("Database error (Customer):", err);
            return res.render("customers-sign-in.ejs", { 
                alertMessage: "Internal Server Error" });
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
                return res.render("customers-sign-in.ejs", {
                    alertMessage: "Invalid email or password."
                });
            }
        } else {
            return res.render("customers-sign-in.ejs", {
                alertMessage: "Invalid email or password."
            });
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
        return res.render("customers-registration.ejs", {
            alertMessage: "Please upload a profile picture."
        });
    }

    // Store image path in the database
    const customerImgPath = "/customers-images/" + req.file.filename; 

    const checkCustomerEmailQuery = "SELECT * FROM customer WHERE customer_email = ?";
    const checkRestaurantEmailQuery = "SELECT * FROM restaurant WHERE restaurant_email = ?";

    // Check if the email is already registered as a restaurant or customer (one email only belong to one type of user (restaurant or customer))
    global.db.get(checkRestaurantEmailQuery, [email], async (err, restaurantData) => {
        if (err) {
            console.error("Database error during insertion:", err);
            return res.render("customers-registration.ejs", {
                alertMessage: "Internal Server Error. Please try again later."
            });
        }

        global.db.get(checkCustomerEmailQuery, [email], async (err, customerData) => {
            if (err) {
                console.error("Database error during insertion:", err);
                return res.render("customers-registration.ejs", {
                    alertMessage: "Internal Server Error. Please try again later."
                });
            }
    
            if(restaurantData){
                return res.render("customers-registration.ejs", {
                    alertMessage: "This email is already registered. Please use a different email."
                });
            } else if (customerData){
                return res.render("customers-registration.ejs", {
                    alertMessage: "This email is already registered. Please use a different email."
                });
            // If the email is not registered as a restaurant or customer, hash the password and insert the new customer data 
            } else {
                bcrypt.hash(password, 10, (hashErr, hashedPassword) => {
                    if (hashErr) {
                        console.error("Error hashing password:", hashErr);
                        return res.render("customers-registration.ejs", {
                            alertMessage: "Internal Server Error. Please try again later."
                        });
                    }
    
                    // insert new customer data with the hashed password
                    const insertQuery = `INSERT INTO customer (customer_name, customer_email, customer_phone_number, customer_password, customer_image) VALUES (?, ?, ?, ?, ?)`;
                    global.db.run(insertQuery, [full_name, email, phone_number, hashedPassword, customerImgPath], (err) => {
                        if (err) {
                            console.error("Error inserting customer data:", err);
                            return res.render("customers-registration.ejs", {
                                alertMessage: "Internal Server Error. Please try again later."
                            });
                        }
                        
                        res.render("customers-sign-in.ejs", {
                            alertMessage: "Registration successful. Please sign in to continue."
                        });
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
            return res.render("customers-account.ejs", {
                alertMessage: "Internal Server Error"
            }); 
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
                return res.render("customers-account.ejs", {
                    alertMessage: "Update Failed"
                });
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
                return res.render("customers-account.ejs", {
                    alertMessage: "Delete Failed"
                });
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
                return res.render("customers-account.ejs", {
                    alertMessage: "Internal Server Error - Update Image Failed"
                });
            } else {
                //Delete Previous Image
                prevCustomerImage = "public/" + customerAccountResult[0].customer_image;
                fs.unlink(prevCustomerImage, (err) => {
                    //Define the query to Update New Customer Image
                    customerImagePath = "/customers-images/" + req.file.filename;
                    updateCustomerImage = [customerImagePath, customerID]
                    updateCustomerImageQuery = "UPDATE customer SET customer_image = ? WHERE customer_id = ?";
            
                    //Execute the query and render the page with the results
                    global.db.run(updateCustomerImageQuery, updateCustomerImage, (err) => {
                        if (err) {
                            return res.render("customers-account.ejs", {
                                alertMessage: "Update New Image Failed"
                            });
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
                res.render("customers-list.ejs", {restaurant_list: restaurantList});
            } else {
                res.render("customers-list.ejs", {restaurant_list: restaurantListResult});
            } 
        }
    })
})

router.get("/book", (req, res) => {
    //Define the query for Restaurant Information
    restaurantDataQuery = "SELECT * FROM restaurant WHERE restaurant_id = ?";

    //Get Restaurant ID 
    const buttonClicked = req.query.bookRestaurant;
    restaurantData = buttonClicked.match(/(\d+)/);
    restaurantID = restaurantData[0];
    req.session.selected_restaurant_id = restaurantID;

    //Saved Inputs
    inputtedDate = req.query.inputted_date;
    inputtedTime = req.query.inputted_time;
    inputtedNumGuests = req.query.inputted_num_guests;
    inputtedSpecialRequest = req.query.inputted_special_request;
    inputted = {inputtedDate: inputtedDate, inputtedTime: inputtedTime, inputtedNumGuests: inputtedNumGuests, inputtedSpecialRequest: inputtedSpecialRequest};

    selectedTableID = req.query.book_selected_table;
         
    //Execute the query and render the page with the results
    global.db.all(restaurantDataQuery, [restaurantID], (err, restaurantDataResult) => {
        if (err) {
            console.error("Database error (Customer - Book):", err);
            return res.send(`
                <script>
                    alert("Internal Server Error");
                    window.location.href = "/customers/list";
                </script>`);
        } else {
            //Get time (per hour) restaurant is open from opening time to closing time
            hoursOpen = [];

            restaurantOpeningTime = restaurantDataResult[0].restaurant_opening_time;
            hourOT = restaurantOpeningTime.split(":")[0];
            minuteOT = restaurantOpeningTime.split(":")[1];

            restaurantClosingTime = restaurantDataResult[0].restaurant_closing_time;
            hourCT = restaurantClosingTime.split(":")[0];
            minuteCT = restaurantClosingTime.split(":")[1];

            intHourOT = parseInt(hourOT);
            intHourCT = parseInt(hourCT);

            if (minuteOT == "00") {
                hoursOpen.push(hourOT + ":00");
            }

            intHourOT = intHourOT + 1;

            while (intHourOT < intHourCT) {
                if (intHourOT < 10) {
                    strHourOT = "0" + intHourOT.toString();
                } else {
                    strHourOT = intHourOT.toString();
                }
                hoursOpen.push(strHourOT + ":00");
                intHourOT = intHourOT + 1;
            }

            if (minuteCT != "00") {
                hoursOpen.push(hourCT + ":00");
            }
            res.render("customers-book.ejs", {restaurant_data: restaurantDataResult[0], opening_hours: hoursOpen, inputted: inputted, selected_table: selectedTableID});
        }
    });
})

// THIS ONE CANNOT USE ALERTMESSAGE 
router.post("/book", (req, res) => {
    var currentUTCDatetime = new Date();
    dateString = currentUTCDatetime.toISOString().slice(0, 10);
    timeString = currentUTCDatetime.toISOString().slice(11, 19);
    datetimeString = dateString + " " + timeString;

    restaurantID = req.session.selected_restaurant_id;
    customerID = req.session.customer_id;
    reservationDate = req.body.booking_date;
    diningTime = req.body.dining_time + ":00";
    bookingTime = datetimeString;
    guestsNum = req.body.num_guests;
    specialRequest = req.body.special_request;
    tableID = req.body.table_id;

    //If a seat is selected
    if (tableID > 0) {
        //Define the query for reserved table
        reservedTableQuery = "INSERT INTO reserved_seating_list (restaurant_id, table_id, dining_date, dining_time) VALUES (?, ?, ?, ?)";

        global.db.all(reservedTableQuery, [restaurantID, tableID, reservationDate, diningTime], (err) => {
            if (err) {
                console.error("Database error (Customer - Book, Reserved Table):", err);
                return res.send(`
                    <script>
                        alert("Internal Server Error");
                        window.location.href = "/customers/list";
                    </script>`);
            } else {
                //Define the query for the added record of reserved_seating_list
                addedReservedSeatQuery = "SELECT * FROM reserved_seating_list ORDER BY seating_id DESC LIMIT 1";

                global.db.all(addedReservedSeatQuery, (err, addedReservedSeatResult) => {
                    if (err) {
                        console.error("Database error (Customer - Book, Added Reserved Seat):", err);
                        return res.send(`
                            <script>
                                alert("Internal Server Error");
                                window.location.href = "/customers/list";
                            </script>`);
                    } else {
                        seatingID = addedReservedSeatResult[0].seating_id;

                        //Define the query to book the selected restaurant
                        bookingQuery = "INSERT INTO reservations (customer_id, rest_id, reservation_date, dining_time, booking_time, num_guests, special_request, seating_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"

                        //Execute the query and render the page with the results
                        global.db.all(bookingQuery, [customerID, restaurantID, reservationDate, diningTime, bookingTime, guestsNum, specialRequest, seatingID], (err) => {
                            if (err) {
                                console.error("Database error (Customer - Book, chosen seat):", err);
                                return res.send(`
                                    <script>
                                        alert("Internal Server Error");
                                        window.location.href = "/customers/list";
                                    </script>`);
                            } else {
                                res.send(`
                                    <script>
                                        alert("Booking successful. You can check the details in the My Bookings Page"); 
                                        window.location.href = "/customers/list";
                                    </script>`);  
                            }
                        });
                    }
                })
            }
        })
    } else { //No table selected, no seatingID
        //Define the query to book the selected restaurant
        bookingQuery = "INSERT INTO reservations (customer_id, rest_id, reservation_date, dining_time, booking_time, num_guests, special_request) VALUES (?, ?, ?, ?, ?, ?, ?)"

        //Execute the query and render the page with the results
        global.db.all(bookingQuery, [customerID, restaurantID, reservationDate, diningTime, bookingTime, guestsNum, specialRequest], (err) => {
            if (err) {
                console.error("Database error (Customer - Book, no chosen seat):", err);
                return res.send(`
                    <script>
                        alert("Internal Server Error");
                        window.location.href = "/customers/list";
                    </script>`);
            } else {
                res.send(`
                    <script>
                        alert("Booking successful. You can check the details in the My Bookings Page"); 
                        window.location.href = "/customers/list";
                    </script>`);  
            }
        });
    }
})

router.get("/view-menu", (req, res) => { //This should change to Pre-Order Menu Feature
    //Define the query for Menu of Selected Restaurant
    restaurantMenuQuery = "SELECT * FROM menu_list WHERE restaurant_id = ?";

    //Get Restaurant ID 
    restaurantID = req.session.selected_restaurant_id;
                    
    //Execute the query and render the page with the results
    global.db.all(restaurantMenuQuery, [restaurantID], (err, restaurantMenuResult) => {
        if (err) {
            console.error("Database error (Customer - View Menu):", err);
            return res.send(`
                <script>
                    alert("Internal Server Error");
                    window.location.href = "/customers/book";
                </script>`);
        } else {
            res.render("customers-view-menu.ejs", {restaurant_menu: restaurantMenuResult, restaurant_id: restaurantID});
        }
    });
})

router.get("/select-table", (req, res) => {
    //Get RestaurantID and Inputs
    restaurantID = req.session.selected_restaurant_id;
    selectedDate = req.query.select_table_dining_date; 
    selectedTimeDatabase = req.query.select_table_dining_time + ":00"; 
    selectedTime = req.query.select_table_dining_time; 
    inputtedNumGuests = req.query.select_table_num_guests;
    inputtedSpecialRequest = req.query.select_table_special_request;
    selectedTableID = req.query.select_table_selected_table;

    inputted = {selectedDate: selectedDate, selectedTime: selectedTime, inputtedNumGuests: inputtedNumGuests, inputtedSpecialRequest: inputtedSpecialRequest};
    
    //Define the query for Restaurant Data
    restaurantDataQuery = "SELECT * FROM restaurant WHERE restaurant_id = ?";
       
    //Execute the query and render the page with the results
    global.db.all(restaurantDataQuery, [restaurantID], (err, restaurantDataResult) => {
        if (err) {
            console.error("Database error (Select Table):", err);
            return res.send(`
                <script>
                    alert("Internal Server Error");
                    window.location.href = "/restaurants/select-table";
                </script>`);
        } else {
            restaurant_data = restaurantDataResult[0];

            //Define the query for List of Tables in the Specific Restaurant
            tableListQuery = "SELECT * FROM restaurant_table_list WHERE restaurant_id = ?";

            //Execute the query and render the page with the results
            global.db.all(tableListQuery, [restaurantID], (err, tableListResult) => {
                if (err) {
                    console.error("Database error (Select Table - Table List):", err);
                    return res.send(`
                        <script>
                            alert("Internal Server Error");
                            window.location.href = "/restaurants/select-table";
                        </script>`);
                } else {
                    //Define the query for List of Reserved Seatings in the Specific Restaurant, Date, and Time
                    reservedSeatingQuery = "SELECT * FROM reserved_seating_list WHERE restaurant_id = ? AND dining_date = ? AND dining_time = ?";
                    global.db.all(reservedSeatingQuery, [restaurantID, selectedDate, selectedTimeDatabase], (err, reservedSeatingResult) => {
                        if (err) {
                            console.error("Database error (Select Table - Reserved Seating List):", err);
                            return res.send(`
                                <script>
                                    alert("Internal Server Error");
                                    window.location.href = "/restaurants/select-table";
                                </script>`);
                        } else {
                            res.render("customers-select-table.ejs", {restaurant_data: restaurant_data, table_list: tableListResult, reserved_seating: reservedSeatingResult, inputted: inputted, selected_table: selectedTableID});
                        }
                    });
                }
            });
        }
    })
})

//Customer My Bookings Page
router.get("/my-bookings", (req, res) => {
    customerID = req.session.customer_id;
    customerReservationsQuery = "SELECT * FROM reservations WHERE customer_id = ? ORDER BY reservation_date ASC";
    global.db.all(customerReservationsQuery, [customerID], (err, customerReservationsResult) => {
        if (err) {
            console.error("Database error (Customer Reservations List)", err);
            return res.render("customers-my-bookings.ejs", {
                alertMessage: "Internal Server Error"
            }); 
        } else {
            allRestaurantQuery = "SELECT * FROM restaurant";
            global.db.all(allRestaurantQuery, (err, allRestaurantResult) => {
                if (err) {
                    return res.send(`
                        <script>
                            alert("Database error (Customer Restaurant List)");
                            window.location.href = "/customers/my-bookings";
                        </script>
                    `);
                } else {
                    res.render("customers-my-bookings.ejs", {reservations_list: customerReservationsResult, restaurants_list: allRestaurantResult});
                }
            })
        }
    });  
});

router.post("/my-bookings", (req, res) => {
    customerID = req.session.customer_id;
    const buttonClicked = req.body.submitButton;
    reservationData = buttonClicked.match(/(\d+)/);
    reservationID = reservationData[0];

    if (buttonClicked.includes("confirmReservation")) {
        confirmReservationQuery = "UPDATE reservations SET status = 'Confirmed' WHERE reservation_id = ?";
        global.db.all(confirmReservationQuery, [reservationID], (err) => {
            if (err) {
                console.error("Database error (Customer Confirm Reservations)", err);
                return res.render("customers-my-bookings.ejs", {
                    alertMessage: "Internal Server Error"
                }); 
            } else {
                res.redirect("/customers/my-bookings");
            }
        })
    } else if (buttonClicked.includes("updateReservation")) {
        newDate = req.body.reservation_date;
        newTime = req.body.timeOptions + ':00';
        newNumGuests = req.body.num_guests;
        newSpecialRequest = req.body.special_request;

        reservationQuery = "SELECT * FROM reservations WHERE reservation_id = ?";
        global.db.all(reservationQuery, [reservationID], (err, reservationResult) => {
            if (err) {
                console.error("Database error (Customer Update Reservations - Get Reservation)", err);
                return res.render("customers-my-bookings.ejs", {
                    alertMessage: "Internal Server Error"
                }); 
            } else {
                reservationUpdateQuery = "UPDATE reservations SET reservation_date = ?, dining_time = ?, num_guests = ?, special_request = ?, seating_id = NULL WHERE reservation_id = ?";
                global.db.all(reservationUpdateQuery, [newDate, newTime, newNumGuests, newSpecialRequest, reservationID], (err) => {
                    if (err) {
                        console.error("Customer Update Reservations", err);
                        return res.send(`
                            <script>
                                alert("Internal Server Error");
                                window.location.href = "/customers/my-bookings";
                            </script>`);
                    } else {
                        reservation = reservationResult[0];
                        if (reservation.seating_id) {
                            deleteReservedSeating = "DELETE FROM reserved_seating_list WHERE seating_id = ?";
                            global.db.run(deleteReservedSeating, [reservation.seating_id], (err) => {
                                if (err) {
                                    return res.send(`
                                        <script>
                                            alert("Customer Update Reservations - Delete Seating");
                                            window.location.href = "/customers/my-bookings";
                                        </script>
                                    `);
                                } else {
                                    res.redirect("/customers/my-bookings");
                                }
                            })
                        } else {
                            res.redirect("/customers/my-bookings");
                        }
                    }
                });
            }
        });  
    } else if (buttonClicked.includes("cancelReservation")) {
        reservationQuery = "SELECT * FROM reservations WHERE reservation_id = ?";
        global.db.all(reservationQuery, [reservationID], (err, reservationResult) => {
            if (err) {
                console.error("Database error (Customer Delete Reservations - Get Reservation)", err);
                return res.render("customers-my-bookings.ejs", {
                    alertMessage: "Internal Server Error"
                }); 
            } else {
                deleteReservationQuery = "DELETE FROM reservations WHERE reservation_id = ?";
                global.db.all(deleteReservationQuery, [reservationID], (err) => {
                    if (err) {
                        console.error("Customer Delete Reservations", err);
                        return res.send(`
                            <script>
                                alert("Internal Server Error");
                                window.location.href = "/customers/my-bookings";
                            </script>`);
                    } else {
                        reservation = reservationResult[0];
                        if (reservation.seating_id) {
                            deleteReservedSeating = "DELETE FROM reserved_seating_list WHERE seating_id = ?";
                            global.db.run(deleteReservedSeating, [reservation.seating_id], (err) => {
                                if (err) {
                                    return res.send(`
                                        <script>
                                            alert("Customer Update Reservations - Delete Seating");
                                            window.location.href = "/customers/my-bookings";
                                        </script>
                                    `);
                                } else {
                                    res.redirect("/customers/my-bookings");
                                }
                            })
                        } else {
                            res.redirect("/customers/my-bookings");
                        }
                    }
                });
            }
        });  
    }
});

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
