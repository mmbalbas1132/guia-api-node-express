const Tarea = require('../models/Tarea');

exports.listar = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

  // Solo las tareas del usuario autenticado
  const filtro = { usuario: req.usuario.id };
  if (req.query.completada !== undefined) {
    filtro.completada = req.query.completada === 'true';
  }

  const [datos, total] = await Promise.all([
    Tarea.find(filtro)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Tarea.countDocuments(filtro),
  ]);

  res.json({ page, limit, total, paginas: Math.ceil(total / limit), datos });
};

exports.obtener = async (req, res) => {
  const tarea = await Tarea.findOne({ _id: req.params.id, usuario: req.usuario.id });
  if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(tarea);
};

exports.crear = async (req, res) => {
  const { titulo, descripcion } = req.body;
  const tarea = await Tarea.create({ titulo, descripcion, usuario: req.usuario.id });
  res.status(201).json(tarea);
};

exports.actualizar = async (req, res) => {
  const { titulo, descripcion, completada } = req.body;
  const tarea = await Tarea.findOneAndUpdate(
    { _id: req.params.id, usuario: req.usuario.id },
    { titulo, descripcion, completada },
    { returnDocument: 'after', runValidators: true }
  );
  if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(tarea);
};

exports.eliminar = async (req, res) => {
  const tarea = await Tarea.findOneAndDelete({ _id: req.params.id, usuario: req.usuario.id });
  if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.status(204).end();
};
