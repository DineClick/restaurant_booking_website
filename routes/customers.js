const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    res.render("customers-homepage");
})

// Customer Sign In page 
router.get("/sign-in", (req, res) => {
    // res.send("Customer Sign In Page");
    res.render("sign-in.ejs")
})

router.post("/sign-in", (req, res) => {
    // check the email and password against the database
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

// Export the router object so index.js can access it
module.exports = router;
