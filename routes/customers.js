const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("customers-homepage");
})

// Customer Login page 
router.get("/login", (req, res) => {
    // res.send("Customer Login Page");
    res.render("login.ejs")
})

router.post("/login", (req, res) => {
    // check the email and password against the database
})

// Customer Registration page (Sign up)
router.get("/register", (req, res) => {
    // res.send("Customer Registration Page");
    res.render("customers-register.ejs")
})

// Customer Profile page (show all information about the customer)
router.get("/profile", (req, res) => {
    res.send("Customer Profile Page");
    res.render("customers-profile.ejs")
})

// Export the router object so index.js can access it
module.exports = router;
