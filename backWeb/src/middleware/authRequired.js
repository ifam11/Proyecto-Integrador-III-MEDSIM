// src/middleware/authRequired.js
import jwt from 'jsonwebtoken';

/**
 * Middleware de autenticación con JWT.
 * - Espera header: Authorization: Bearer <token>
 * - En caso de OK, setea req.user = { id, email, rol }
 */
export function authRequired(req, res, next) {
  const h = req.headers?.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'No autenticado' });

  try {
    const secret = process.env.JWT_SECRET || 'devsecret';
    const payload = jwt.verify(token, secret);
    // payload debería venir de tu login: { id, email, rol }
    req.user = { id: payload.id, email: payload.email, rol: payload.rol };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Token inválido/expirado' });
  }
}

// Export default también, para que funcionen ambos estilos de import
export default authRequired;
