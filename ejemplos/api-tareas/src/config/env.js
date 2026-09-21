// Lee y valida la configuración una sola vez, al arrancar.
const requeridas = ['MONGODB_URI', 'JWT_SECRET'];

for (const nombre of requeridas) {
  if (!process.env[nombre]) {
    throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
