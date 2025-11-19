import jwt from 'jsonwebtoken';

/** Requiere token válido y coloca {id,email,rol} en req.user */
export function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No autenticado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.id,
      email: payload.email,
      rol: payload.rol || payload.role || 'estudiante',
    };
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido/expirado' });
  }
}

/** Restringe por rol del backend: 'estudiante' | 'docente' | 'administrador' */
export function requireRole(roles) {
  return (req, res, next) => {
    const r = req.user?.rol;
    if (!r || !roles.includes(r)) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    next();
  };
}
