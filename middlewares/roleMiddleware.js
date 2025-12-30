export const isAdmin = (req, res, next) => {
  if (req.user && req.user.u_role === 1) return next();
  return res.status(403).json({ success: false, message: "Access denied: Admins only" });
};

export const isStudent = (req, res, next) => {
  if (req.user && req.user.u_role === 0) return next();
  return res.status(403).json({ success: false, message: "Access denied: Students only" });
};
