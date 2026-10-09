// req.user is set by verifyTokenMiddleware; its `role` is "admin" or "user"
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  return res.status(403).json({ success: false, message: "Access denied: Admins only" });
};

export const isStudent = (req, res, next) => {
  if (req.user && req.user.role === "user") return next();
  return res.status(403).json({ success: false, message: "Access denied: Students only" });
};

// For /api/auth/:id routes, where :id is the user's u_user_id
export const isAdminOrSelf = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || String(req.user.userId) === String(req.params.id)))
    return next();
  return res.status(403).json({ success: false, message: "Access denied" });
};
