// src/middleware/roleRequired.js
export function roleRequired(roles = []) {
  return (req, res, next) => {
    const rol = req.user?.rol;
    if (!rol) return res.status(401).json({ message: 'No autenticado' });
    if (roles.length && !roles.includes(rol)) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    return next();
  };
}
