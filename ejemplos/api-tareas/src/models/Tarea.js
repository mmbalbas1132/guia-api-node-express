const { Schema, model } = require('mongoose');

const tareaSchema = new Schema(
  {
    titulo: { type: String, required: true, trim: true, maxlength: 120 },
    descripcion: { type: String, trim: true, default: '' },
    completada: { type: Boolean, default: false },
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  },
  { timestamps: true }
);

module.exports = model('Tarea', tareaSchema);
