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

// 3. Restaurant Login page 
router.get("/login", (req, res) => {
    // res.send("Restaurant Login Page");
    res.render("login.ejs")
})

router.post("/login", (req, res) => {
    // check the email and password against the database
})

// 4. Restaurant Registration page (Sign up)
router.get("/register", (req, res) => {
    // res.send("Restaurant Registration Page");
    res.render("restaurants-register.ejs")
})

// 5. Restaurant Profile page (show all information about the restaurant)
// Need to implement when the restaurant want to update the information or delete the account
router.get("/profile", (req, res) => {
    res.send("Restaurant Profile Page");
    res.render("restaurants-profile.ejs")
})

// 4. list of the Restaurant (when click on restaurant button)
// book button cannot be clicked because is restaurant account
router.get("/list", (req, res) => {
    res.send("List of the Restaurant");
})

// Export the router object so index.js can access it
module.exports = router;
