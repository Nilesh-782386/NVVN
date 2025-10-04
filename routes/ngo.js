import express from "express";
import { query } from "../db.js";
import fs from "fs";
import path from "path";
import { ensureNGOAuthenticated } from "../middleware/auth.js";

const router = express.Router();

// NGO: Create donation request
router.get("/ngo/dashboard", ensureNGOAuthenticated, async (req, res) => {
  try {
    const ngoCity = req.session.ngo?.city || '';
    const openResult = await query(
      "SELECT * FROM donations WHERE status = 'pending' ORDER BY created_at DESC"
    );
    const assignedResult = await query(
      "SELECT * FROM donations WHERE status = 'assigned' ORDER BY assigned_at DESC"
    );
    const deliveredResult = await query(
      "SELECT * FROM donations WHERE status = 'delivered' ORDER BY updated_at DESC"
    );
    res.render("ngo/dashboard", { open: openResult[0], assigned: assignedResult[0], delivered: deliveredResult[0], ngo: req.session.ngo });
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

router.post("/ngo/requests", ensureNGOAuthenticated, async (req, res) => {
  const { title, description, city } = req.body;
  try {
    await query(
      "INSERT INTO donations (title, description, city, status, created_at) VALUES (?, ?, ?, 'pending', NOW())",
      [title, description, city]
    );
    res.redirect("/ngo/dashboard");
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

// Admin: List and verify NGOs with filters/search

router.get("admin/all-donations", ensureNGOAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  const { status, city, search } = req.query;
  let whereClauses = [];
  let values = [];
  let idx = 0;
  if (status && status !== "") {
    whereClauses.push(`status = ?`);
    values.push(status);
  }
  if (city && city !== "") {
    whereClauses.push(`LOWER(city) = LOWER(?)`);
    values.push(city);
  }
  if (search && search !== "") {
    whereClauses.push(`(
      LOWER(fname) LIKE LOWER(?) OR
      LOWER(lname) LIKE LOWER(?) OR
      LOWER(city) LIKE LOWER(?) OR
      LOWER(addline) LIKE LOWER(?)
    )`);
    values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  let whereSQL =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  try {
    const query = `SELECT id, books, clothes, grains, footwear, toys, school_supplies, fname, lname, email, phone, phone2, flat, addline, land, city, state, pincode, optnote, pickup_date, pickup_time, status FROM donations ${whereSQL} ORDER BY id DESC LIMIT ? OFFSET ?`;
    const rowsResult = await query(query, [...values, limit, offset]);
    
    const countQuery = `SELECT COUNT(*) as count FROM donations ${whereSQL}`;
    const countResult = await query(countQuery, values);
    const total = parseInt(countResult[0][0].count);
    
    const totalPages = Math.ceil(total / limit);
    
    const totalRequestsResult = await query("SELECT COUNT(*) as count FROM donations");
    const completedResult = await query("SELECT COUNT(*) as count FROM donations WHERE status = 'completed'");
    const activeResult = await query("SELECT COUNT(*) as count FROM donations WHERE status = 'pending'");
    
    res.render("admin/AllDonations", {
      donations: rowsResult[0],
      currentPage: page,
      totalPages,
      user: req.session.user,
      ngo: req.session.ngo,
      totalRequests: parseInt(totalRequestsResult[0][0].count),
      completedCount: parseInt(completedResult[0][0].count),
      activeCount: parseInt(activeResult[0][0].count),
      filterStatus: status || "",
      filterCity: city || "",
      filterSearch: search || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// COMMENTED OUT: Admin routes moved to admin.js to avoid conflicts
/*
router.get("/admin/ngos", ensureNGOAuthenticated, async (req, res) => {
  // ... admin NGO management code moved to admin.js
});
*/

// COMMENTED OUT: Admin routes moved to admin.js to avoid conflicts
/*
// Admin: Update NGO status
router.post("/admin/ngos/:id/status", ensureNGOAuthenticated, async (req, res) => {
  // ... moved to admin.js
});

// Serve NGO registration certificate as PDF or image
router.get("/admin/ngos/:id/certificate", ensureNGOAuthenticated, async (req, res) => {
  // ... moved to admin.js
});
*/

export default router;