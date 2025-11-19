import { Router } from 'express';
const router = Router();

router.post('/contact', (req, res) => {
  const { nombre, email, mensaje } = req.body || {};
  if (!nombre || !email || !mensaje)
    return res.status(400).json({ message: 'Datos incompletos' });

  console.log('📨 Contacto recibido:', { nombre, email, mensaje });
  res.status(201).json({ message: '¡Mensaje recibido! Te contactaremos pronto.' });
});

export default router;
