//main entry point for the application

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

//
const session = require('express-session');

app.use(session({
    secret: 'dineclick',
    resave: false, 
    saveUninitialized: true
})); 

// changes : instead of sending the html, we are rendering the ejs file
app.get('/', (req, res) => {
    res.render('homepage.ejs');
})

const restaurantsRoutes = require('./routes/restaurants');
app.use('/restaurants', restaurantsRoutes);

const customerRoutes = require('./routes/customers');
app.use('/customers', customerRoutes);


// Make the web application listen for HTTP requests
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

