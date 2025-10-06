import express from "express";
import { query } from "../db.js";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = express.Router();

// Multer setup for NGO registration (file upload)
const uploadDir = path.resolve("upload");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
function fileFilter(req, file, cb) {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, and PNG files are allowed!"), false);
  }
}
const upload = multer({ storage, fileFilter });
const saltRounds = 10;

// User login - ✅ FIXED
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log("🔍 LOGIN ATTEMPT:", { email, passwordLength: password?.length });
  
  try {
    const result = await query("SELECT * FROM users WHERE email = ?", [email]);
    console.log("🔍 DATABASE RESULT:", result?.length || 0, "users found");
    
    // ✅ FIXED: result is now direct array of rows
    if (result && result.length > 0) {
      const user = result[0];
      console.log("🔍 USER FOUND:", { id: user.id, email: user.email });
      
      const valid = await bcrypt.compare(password, user.password);
      console.log("🔍 PASSWORD VALID:", valid);
      
      if (valid) {
        req.session.user = user;
        console.log("🔍 SESSION SET:", req.session.user?.id);
        return res.json({ status: "success", redirect: "/" });
      } else {
        console.log("🔍 PASSWORD INVALID");
        return res
          .status(401)
          .json({ status: "error", message: "Incorrect password" });
      }
    } else {
      console.log("🔍 USER NOT FOUND");
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
  } catch (err) {
    console.error("🔍 LOGIN ERROR:", err);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

// NGO login - ✅ FIXED WITH DEBUGGING
router.post("/ngo-login", async (req, res) => {
  const { email, password } = req.body;
  console.log("NGO Login Attempt:", { email, password });
  
  try {
    const sqlQuery = "SELECT * FROM ngo_register WHERE email = ?";
    const result = await query(sqlQuery, [email]);
    console.log("Database Result:", result);
    
    if (result && result.length > 0) {
      const ngo = result[0];
      console.log("Found NGO:", ngo.registration_number);
      
      if (ngo.registration_number === password) {
        console.log("Login SUCCESS");
        req.session.ngo = ngo; // Set NGO session properly
        req.session.user = ngo; // Also set user session for compatibility
        return res.json({ success: true, message: "Login successful", redirect: "/ngo-dashboard" });
      } else {
        console.log("Password MISMATCH");
        return res.status(401).json({ success: false, message: "Incorrect password" });
      }
    } else {
      console.log("NGO NOT FOUND");
      return res.status(404).json({ success: false, message: "NGO not found" });
    }
  } catch (err) {
    console.error("Error logging in:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Volunteer login moved to volunteer.js to avoid duplication

// User registration - ✅ FIXED
router.post("/register-user", async (req, res) => {
  const { Fullname, phone, email, password, city } = req.body;
  try {
    const checkResult = await query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );
    // ✅ FIXED: checkResult is now direct array
    if (checkResult && checkResult.length > 0) {
      return res.redirect("/user-login");
    } else {
      const hash = await bcrypt.hash(password, saltRounds);
      await query(
        "INSERT INTO users (fullname, phone, email, password, city, district) VALUES (?, ?, ?, ?, ?, ?)",
        [Fullname, phone, email, hash, city || 'Pune', (city || 'Pune').toLowerCase()]
      );
      return res.redirect("/user-login");
    }
  } catch (err) {
    console.error("Error saving user to database:", err);
    res.status(500).send("Internal Server Error");
  }
});

// NGO registration - ✅ FIXED
// NGO registration - ✅ FIXED VERSION
router.post("/ngo-register", upload.single("file"), async (req, res) => {
  console.log("🔍 NGO Registration Attempt:");
  console.log("Request body:", req.body);
  console.log("File uploaded:", req.file);
  
  const {
    name,
    registration_number,
    email,
    phone,
    phone2,
    addline,
    land,
    city,
    state,
    pincode,
    optnote,
    url,
    socialsurl,
    terms,
    ngo_type,
  } = req.body;
  const registration_certificate = req.file;
  
  console.log("📝 Registration Data:");
  console.log("Name:", name);
  console.log("Registration Number:", registration_number);
  console.log("Email:", email);
  console.log("Phone:", phone);
  console.log("City:", city);
  console.log("NGO Type:", ngo_type);
  console.log("File:", registration_certificate ? registration_certificate.filename : "No file");
  
  if (!registration_certificate) {
    console.log("❌ File upload failed - no certificate provided");
    return res.status(400).send("File upload failed or invalid file type");
  }
  
  try {
    console.log("🔍 Checking for duplicate registration number:", registration_number);
    const checkResult = await query(
      "SELECT id FROM ngo_register WHERE registration_number = ?",
      [registration_number]
    );
    
    console.log("Duplicate check result:", checkResult[0]);
    
    if (checkResult[0] && checkResult[0].length > 0) {
      console.log("❌ Registration number already exists:", registration_number);
      return res.render("login_register/ngo-register", {
        user: req.session.user,
        error: "Registration number already exists. Please use a unique registration number.",
      });
    }
    
    console.log("✅ Registration number is unique, proceeding with registration...");

    const insertQuery = `
      INSERT INTO ngo_register (
        ngo_name,
        registration_number,
        email,
        primary_phone,
        alternate_phone,
        address,
        landmark,
        city,
        district,
        state,
        pincode,
        description,
        website_url,
        social_handle_url,
        registration_certificate,
        status,
        latitude,
        longitude,
        ngo_type,
        can_accept_universal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    console.log("📝 Inserting NGO into database...");
    const result = await query(insertQuery, [
      name,
      registration_number,
      email,
      phone,
      phone2,
      addline,
      land,
      city,
      city.toLowerCase(), // Store district (lowercase)
      state,
      pincode,
      optnote,
      url,
      socialsurl,
      registration_certificate.filename,
      'applied',
      null,
      null,
      ngo_type || 'multi_purpose',
      true
    ]);
    
    console.log("✅ NGO Registration Successful:");
    console.log("NGO ID:", result.insertId);
    console.log("NGO Name:", name);
    console.log("Email:", email);
    console.log("Status: applied");
    console.log("Type:", ngo_type || 'multi_purpose');
    console.log("Registration Number:", registration_number);
    
    // ✅ FIXED: Show success message and redirect
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Successful - CareConnect</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .success-container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 90%;
          }
          .success-icon {
            font-size: 80px;
            color: #28a745;
            margin-bottom: 20px;
          }
          .success-title {
            color: #333;
            font-size: 28px;
            margin-bottom: 20px;
            font-weight: bold;
          }
          .success-message {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .highlight {
            color: #667eea;
            font-weight: bold;
          }
          .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: transform 0.3s ease;
          }
          .btn:hover {
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-icon">✅</div>
          <h1 class="success-title">Registration Successful!</h1>
          <p class="success-message">
            Thank you for registering your NGO <span class="highlight">"${name}"</span> with CareConnect.<br><br>
            We will verify your details and registration certificate within <span class="highlight">24 hours</span>.<br><br>
            You will receive an email notification once your NGO is approved and ready to accept donations.
          </p>
          <a href="/ngo-login" class="btn">Go to NGO Login</a>
        </div>
        <script>
          // Auto-redirect after 10 seconds
          setTimeout(function() {
            window.location.href = "/ngo-login";
          }, 10000);
        </script>
      </body>
      </html>
    `);
    
  } catch (err) {
    console.error("❌ Error saving NGO to database:", err);
    console.error("Error details:", err.message);
    console.error("Error code:", err.code);
    res.status(500).send("Internal Server Error");
  }
});
// Volunteer registration moved to volunteer.js to avoid duplication

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Volunteer logout
router.get("/volunteer-logout", (req, res) => {
  req.session.volunteer = null;
  res.redirect("/");
});


export default router;