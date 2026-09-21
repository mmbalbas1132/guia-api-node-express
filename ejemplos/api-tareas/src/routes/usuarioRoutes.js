const { Router } = require('express');
const { autenticar, autorizarRoles } = require('../middlewares/auth');
const { listar } = require('../controllers/usuarioController');

const router = Router();

router.get('/', autenticar, autorizarRoles('admin'), listar);

module.exports = router;
