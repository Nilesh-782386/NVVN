import express from "express";
import { query } from "../db.js";
import bcrypt from "bcrypt";

const router = express.Router();

// Volunteer registration (support both URLs)
router.post(["/volunteer-register", "/volunteer/register"], async (req, res) => {
  const { name, email, phone, password, city, vehicle_type } = req.body;
  
  try {
    const checkResult = await query(
      "SELECT * FROM volunteers WHERE email = ?", 
      [email]
    );
    
    if (checkResult && checkResult.length > 0) {
      return res.redirect("/volunteer-register?error=exists");
    }

    const hash = await bcrypt.hash(password, 10);
    await query(
      `INSERT INTO volunteers (name, fullname, email, phone, password, city, district, vehicle_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, name, email, phone, hash, city, city.toLowerCase(), vehicle_type]
    );

    res.redirect("/volunteer-login?success=registered");
  } catch (err) {
    console.error("Registration error:", err);
    res.redirect("/volunteer-register?error=server");
  }
});

// Volunteer login (support both URLs)
router.post(["/volunteer-login", "/volunteer/login"], async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await query(
      "SELECT * FROM volunteers WHERE email = ? AND status = 'active'", 
      [email]
    );
    
    if (result && result.length > 0) {
      const volunteer = result[0];
      const valid = await bcrypt.compare(password, volunteer.password);
      
      if (valid) {
        req.session.volunteer = volunteer;
        return res.redirect("/volunteer-dashboard");
      }
    }
    
    res.redirect("/volunteer-login?error=invalid");
  } catch (err) {
    console.error("Login error:", err);
    res.redirect("/volunteer-login?error=server");
  }
});

// Volunteer logout
router.get("/volunteer-logout", (req, res) => {
  req.session.volunteer = null;
  res.redirect("/");
});

// API: Get volunteer's saved location
router.get("/api/volunteer/my-location", async (req, res) => {
  try {
    if (!req.session.volunteer) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }
    
    const volunteerId = req.session.volunteer.id;
    const result = await query(
      'SELECT latitude, longitude FROM volunteers WHERE id = ?',
      [volunteerId]
    );
    
    if (result && result.length > 0) {
      res.json({
        success: true,
        location: {
          lat: result[0].latitude || 0,
          lng: result[0].longitude || 0
        }
      });
    } else {
      res.json({
        success: true,
        location: { lat: 0, lng: 0 }
      });
    }
  } catch (error) {
    console.error("Get volunteer location error:", error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get location' 
    });
  }
});

export default router;