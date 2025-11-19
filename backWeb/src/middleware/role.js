// Control de acceso por rol
export function roleRequired(roles = []) {
  return (req, res, next) => {
    if (!roles.length) return next();
    const role = req.user?.rol || req.user?.role; // por si guardaste 'rol' o 'role'
    if (roles.includes(role)) return next();
    return res.status(403).json({ message: 'No autorizado' });
  };
}
