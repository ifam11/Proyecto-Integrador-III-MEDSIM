// authRequired.js
export function authRequired(req,res,next){
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, rol }
    return next();
  } catch {
    return res.status(401).json({ message: 'Token inválido/expirado' });
  }
}

// roleRequired.js
export function roleRequired(roles=[]){
  return (req,res,next)=>{
    const rol = req.user?.rol;
    if (roles.includes(rol)) return next();
    return res.status(403).json({ message: 'No autorizado' });
  }
}
