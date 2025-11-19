import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { router } from './routes/index.js';


const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ ok: true, name: 'med-sim-backend' }));
app.use('/api', router);

// manejo de errores básico
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno', detail: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));
