// Middleware to check if user is authenticated
export function ensureUserAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  
  // Check if this is an API request
  if (req.path.startsWith('/api/') || req.headers['content-type'] === 'application/json') {
    return res.status(401).json({
      success: false,
      error: "Session expired. Please log in again.",
      type: "session_error"
    });
  }
  
  return res.redirect("/user-login");
}

// Middleware to check if NGO is authenticated
export function ensureNGOAuthenticated(req, res, next) {
  if (req.session && req.session.ngo) {
    return next();
  }
  
  // Check if this is an API request
  if (req.path.startsWith('/api/') || req.headers['content-type'] === 'application/json') {
    return res.status(401).json({
      success: false,
      error: "Session expired. Please log in again.",
      type: "session_error"
    });
  }
  
  return res.redirect("/ngo-login");
}

// Middleware to check if volunteer is authenticated
export function ensureVolunteerAuthenticated(req, res, next) {
  if (req.session && req.session.volunteer) {
    return next();
  }
  
  // Check if this is an API request
  if (req.path.startsWith('/api/') || req.headers['content-type'] === 'application/json') {
    return res.status(401).json({
      success: false,
      error: "Session expired. Please log in again.",
      type: "session_error"
    });
  }
  
  return res.redirect("/volunteer-login");
}

// Middleware to check if admin is authenticated
export function ensureAdminAuthenticated(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  
  // Check if this is an API request
  if (req.path.startsWith('/api/') || req.headers['content-type'] === 'application/json') {
    return res.status(401).json({
      success: false,
      error: "Session expired. Please log in again.",
      type: "session_error"
    });
  }
  
  return res.redirect("/admin-login");
}
