const { Router } = require('express');
const { body, param } = require('express-validator');
const { autenticar } = require('../middlewares/auth');
const validar = require('../middlewares/validar');
const c = require('../controllers/tareaController');

const router = Router();

// Todas las rutas de este router exigen estar autenticado
router.use(autenticar);

const idValido = param('id').isMongoId().withMessage('Identificador no válido');

/**
 * @openapi
 * /tareas:
 *   get:
 *     summary: Lista las tareas del usuario autenticado (paginadas)
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 10, maximum: 100 } }
 *       - { in: query, name: completada, schema: { type: boolean } }
 *     responses:
 *       200:
 *         description: Página de tareas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 *                 paginas: { type: integer }
 *                 datos:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Tarea' }
 *       401:
 *         description: Sin token o token no válido
 */
router.get('/', c.listar);

/**
 * @openapi
 * /tareas/{id}:
 *   get:
 *     summary: Obtiene una tarea por su id
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200:
 *         description: La tarea
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Tarea' }
 *       404:
 *         description: No existe (o no pertenece al usuario)
 */
router.get('/:id', idValido, validar, c.obtener);

/**
 * @openapi
 * /tareas:
 *   post:
 *     summary: Crea una tarea
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TareaEntrada' }
 *     responses:
 *       201:
 *         description: Tarea creada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Tarea' }
 *       400:
 *         description: Datos no válidos
 */
router.post(
  '/',
  [
    body('titulo').trim().notEmpty().withMessage('El título es obligatorio'),
    body('descripcion').optional().isString().trim(),
  ],
  validar,
  c.crear
);

/**
 * @openapi
 * /tareas/{id}:
 *   put:
 *     summary: Actualiza una tarea (solo los campos enviados)
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TareaEntrada' }
 *     responses:
 *       200:
 *         description: Tarea actualizada
 *       404:
 *         description: No existe
 */
router.put(
  '/:id',
  [
    idValido,
    body('titulo').optional().trim().notEmpty().withMessage('El título no puede estar vacío'),
    body('descripcion').optional().isString().trim(),
    body('completada').optional().isBoolean().withMessage('completada debe ser true o false').toBoolean(),
  ],
  validar,
  c.actualizar
);

/**
 * @openapi
 * /tareas/{id}:
 *   delete:
 *     summary: Elimina una tarea
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       204:
 *         description: Eliminada
 *       404:
 *         description: No existe
 */
router.delete('/:id', idValido, validar, c.eliminar);

module.exports = router;
