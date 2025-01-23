//main entry point for the application

// Set up express, bodyparser and EJS
const express = require('express');
const app = express();
const port = 3000;
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); // set the app to use ejs for rendering
app.use(express.static(__dirname + '/public')); // set location of static files

// Set up SQLite
// Items in the global namespace are accessible throught out the node application
const sqlite3 = require('sqlite3').verbose();
global.db = new sqlite3.Database('./database.db',function(err){
    if(err){
        console.error(err);
        process.exit(1); // bail out we can't connect to the DB
    } else {
        console.log("Database connected");
        global.db.run("PRAGMA foreign_keys=ON"); // tell SQLite to pay attention to foreign key constraints
    }
});

// Overall homepage before users choose to login
app.get('/', (req, res) => {
    // res.send('Home page before login')
    res.send(`
        <h1>Welcome to the Restaurant Reservation System</h1>
        <p> Please choose your role </p>
    
        <a href="/">Home</a>
        <a href="/restaurants/about">About</a>
        <a href="/restaurants/list">Restaurant</a>
        <a href="/customers/sign-in">My Bookings</a>
        <a href="/customers/sign-in">Sign In</a>
        
        <br><br>
        <a href="/customers/sign-in">Reserve Now</a>
    `);
});

const restaurantsRoutes = require('./routes/restaurants');
app.use('/restaurants', restaurantsRoutes);

const customerRoutes = require('./routes/customers');
app.use('/customers', customerRoutes);


// Make the web application listen for HTTP requests
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

