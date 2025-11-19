// backWeb/src/routes/forums.routes.js
import { Router } from 'express';
import {
  listForums,
  listThreads,
  createThread,
  listPosts,
  createPost
} from '../controllers/forums.controller.js';
import authRequired from '../middleware/authRequired.js'; // <- default

const router = Router();

// Rutas más específicas primero
router.get('/threads/:threadId/posts', listPosts);
router.post('/threads/:threadId/posts', authRequired, createPost);

router.get('/:forumId/threads', listThreads);
router.post('/:forumId/threads', authRequired, createThread);

// Pública
router.get('/', listForums);

export default router;
