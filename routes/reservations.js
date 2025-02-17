const express = require("express");
const router = express.Router();
const reservationController = require("../controllers/reservation");

// Middleware for authentication
const authenticateCustomer = (req, res, next) => {
    if (!req.session.customer_id) {
        return res.status(401).json({ message: "User not authenticated" });
    }
    next();
};

const authenticateRestaurant = (req, res, next) => {
    if (!req.session.restaurant_id) {
        return res.status(401).json({ message: "Restaurant not authenticated" });
    }
    next();
};


router.get("/my-bookings", authenticateCustomer, async (req, res) => {
    try {
        const userId = req.session.customer_id;
        const reservations = await reservationController.getReservationsForEjs(userId);
        
        res.render("customers-booking", { 
            customer_data: { customer_name: req.session.customer_name }, 
            reservations 
        });
    } catch (error) {
        console.error("Error fetching reservations:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.get("/restaurant/bookings", authenticateRestaurant, async (req, res) => {
    try {
        const restaurantId = req.session.restaurant_id;
        const reservations = await reservationController.getReservationsForRestaurant(restaurantId);
        
        res.render("restaurant-bookings", { 
            restaurant_data: { restaurant_name: req.session.restaurant_name }, 
            reservations 
        });
    } catch (error) {
        console.error("Error fetching reservations:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/:id/delete", authenticateCustomer, async (req, res) => {
    try {
        const { id: resId } = req.params;
        await reservationController.deleteReservation(req, res);
        res.redirect("/reservations/my-bookings");
    } catch (error) {
        console.error("Error deleting reservation:", error);
        res.status(500).send("Error deleting reservation");
    }
});

// API Routes for Frontend or AJAX Calls
router.get("/available/:date/:id", reservationController.checkAvailableSlots);
router.post("/create", authenticateCustomer, reservationController.createReservation);
router.delete("/:id", authenticateCustomer, reservationController.deleteReservation);
router.get("/user/:id/:status", authenticateCustomer, reservationController.getReservationsByUserId);
router.get("/restaurant/:id/:status", authenticateRestaurant, reservationController.getReservationsByRestId);
router.put("/update-status/:id", authenticateRestaurant, reservationController.updateReservationStatus);

module.exports = router;
