const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const reservasRouter = require('./routes/reservas'); 
// Importamos la función de conexión y el pool de la BD
const { connectDB } = require('./db-connect'); 

const app = express();
const PORT = 3000;

// *** Conectar a la Base de Datos al iniciar el servidor ***
connectDB(); // Esto se encarga de probar la conexión y crear la tabla.

// --- MIDDLEWARES ---
app.use(cors()); 
app.use(bodyParser.json()); 

// --- RUTAS ---
app.get('/', (req, res) => {
    res.send('Servidor de Hotel funcionando con MariaDB/MySQL.');
});
app.use('/api', reservasRouter); 

// --- INICIO DEL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express escuchando en http://localhost:${PORT}`);
});