const express = require("express");
const router = express.Router();


// 1. Restaurant Homepage after login (Sign in change to account)
router.get("/", (req, res) => {
    res.render("restaurants-homepage");
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

router.post("/sign-in", (req, res) => {
    // check the email and password against the database
})

// 4. Restaurant Registration page (Sign up)
router.get("/registration", (req, res) => {
    // res.send("Restaurant Registration Page");
    res.render("restaurants-registration.ejs")
})

// 5. Restaurant Account page (show all information about the restaurant)
// Need to implement when the restaurant want to update the information or delete the account
router.get("/account", (req, res) => {
    res.send("Restaurant Account Page");
    res.render("restaurants-account.ejs")
})

// 4. list of the Restaurant (when click on restaurant button)
// book button cannot be clicked because is restaurant account
router.get("/list", (req, res) => {
    res.send("List of the Restaurant");
})

// Export the router object so index.js can access it
module.exports = router;
