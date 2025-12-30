const mysql = require('mysql2');

// Configuración de la conexión a MariaDB/MySQL

const pool = mysql.createPool({
    host: 'localhost',      // O la IP de tu servidor de DB
    user: 'root',           // Usuario de tu DB
    password: '',
    database: 'hotel_reservas_db', // Nombre de la base de datos
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convertir el pool a Promesas para usar async/await con 'execute'
const promisePool = pool.promise();

// Función para crear la tabla de reservas (Schema)
const createReservasTable = async () => {
    // Usamos el pool para ejecutar la sentencia SQL de creación de tabla.
    const query = `
        CREATE TABLE IF NOT EXISTS reservas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            habitacionTipo VARCHAR(50) NOT NULL,
            llegada DATE NOT NULL,
            salida DATE NOT NULL,
            fechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    await promisePool.execute(query);
    console.log('✅ Tabla "reservas" verificada/creada.');
};

// Función principal de prueba de conexión
const connectDB = async () => {
    try {
        // Obtenemos y liberamos una conexión del pool para verificar que el servicio esté activo.
        const connection = await promisePool.getConnection();
        connection.release();
        console.log('✅ MariaDB/MySQL conectado con éxito. Pool listo.');

        // Crear la tabla si no existe (se ejecuta una sola vez)
        await createReservasTable();

    } catch (err) {
        console.error('❌ Error de conexión a MariaDB/MySQL:', err.message);
        console.error('Verifica si tu servidor MariaDB está encendido y si las credenciales (user/password) en db-connect.js son correctas.');
        // Salir del proceso si la conexión falla para evitar que el servidor Express inicie sin BD.
        process.exit(1);
    }
};

// Exportamos la función de conexión (para server.js) y el pool (para rutas/reservas.js)
module.exports = { connectDB, pool: promisePool };