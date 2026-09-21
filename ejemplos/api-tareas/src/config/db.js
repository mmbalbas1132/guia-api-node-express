const mongoose = require('mongoose');
const { mongodbUri } = require('./env');

async function conectarDB() {
  await mongoose.connect(mongodbUri);
  console.log('MongoDB conectado');
}

async function desconectarDB() {
  await mongoose.disconnect();
}

module.exports = { conectarDB, desconectarDB };
