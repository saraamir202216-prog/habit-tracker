const jwt = require("jsonwebtoken");

// SRS 2.1 / FR-13: users may only access their own habits and logs.
// Every protected route runs this first; it reads the JWT from the
// Authorization header, verifies it, and attaches req.userId so
// controllers can scope every query to the logged-in user.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = requireAuth;
