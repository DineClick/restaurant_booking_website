const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();

// Customer Homepage
router.get("/", (req, res) => {
  res.render("customers-homepage");
});

// Customer Sign-In page
router.get("/sign-in", (req, res) => {
  res.render("customer-sign-in.ejs");
});

// Handling customer sign-in (checks email and password)
router.post("/sign-in", async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = `SELECT * FROM customer WHERE customer_email = ?`;
    global.db.get(query, [email], async (err, customerData) => {
      if (err) {
        console.error("Database error:", err);
        return res.send(`
                    <script>
                        alert("Internal Server Error");
                        window.location.href = "/customers/sign-in";
                    </script>
                `);
      }

      if (customerData) {
        const isPasswordValid = await bcrypt.compare(
          password,
          customerData.customer_password
        );
        if (isPasswordValid) {
          // If the password matches, save session data and redirect
          req.session.customer_id = customerData.customer_id;
          req.session.customer_name = customerData.customer_name;
          return res.redirect("/customers/account");
        } else {
          // If the password is incorrect
          return res.send(`
                        <script>
                            alert("Invalid email or password.");
                            window.location.href = "/customers/sign-in";
                        </script>
                    `);
        }
      } else {
        // If no customer data is found
        return res.send(`
                    <script>
                        alert("Invalid email or password.");
                        window.location.href = "/customers/sign-in";
                    </script>
                `);
      }
    });
  } catch (error) {
    console.error("Sign-In error:", error);
    return res.status(500).send(`
            <script>
                alert("Internal Server Error");
                window.location.href = "/customers/sign-in";
            </script>
        `);
  }
});

// Customer Registration page
router.get("/registration", (req, res) => {
  res.render("customers-registration.ejs");
});

// Handling customer registration (hashes the password and saves the user)
router.post("/registration", async (req, res) => {
  const { email, password, name } = req.body;
  try {
    console.log("Received data:", email, password, name); // 받은 데이터 확인

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed password:", hashedPassword); // 해싱된 비밀번호 확인

    const insertQuery = `INSERT INTO customer (customer_email, customer_password, customer_name) VALUES (?, ?, ?)`;

    global.db.run(insertQuery, [email, hashedPassword, name], (err) => {
      if (err) {
        console.error("Database error during insertion:", err); // 쿼리 실행 중 오류 발생 시
        return res.send(`
                <script>
                    alert("Internal Server Error");
                    window.location.href = "/customers/registration";
                </script>
            `);
      }

      console.log("Customer registered successfully"); // 성공적으로 등록되었을 때
      res.redirect("/customers/sign-in");
    });
  } catch (error) {
    console.error("Registration error:", error); // 전체적인 오류 로그 출력
    res.status(500).send(`
            <script>
                alert("Internal Server Error");
                window.location.href = "/customers/registration";
            </script>
        `);
  }
});

// Export the router object so index.js can access it
module.exports = router;
