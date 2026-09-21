const { Schema, model } = require('mongoose');

const usuarioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false -> el hash nunca sale en las consultas salvo que se pida explícitamente
    password: { type: String, required: true, select: false },
    rol: { type: String, enum: ['usuario', 'admin'], default: 'usuario' },
  },
  { timestamps: true }
);

module.exports = model('Usuario', usuarioSchema);
