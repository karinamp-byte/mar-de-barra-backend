const express = require('express');
const router = express.Router();
// Importamos la conexión a MariaDB
const { pool } = require('../db-connect'); 
// Importamos la instancia de Mercado Pago configurada
const mpClient = require('../mercadopago-config'); 

const { Preference } = require('mercadopago'); 
const preference = new Preference(mpClient);


// =================================================================================
// DEFINICIÓN DE URLs: Solución de Validación de Mercado Pago
// =================================================================================

// URLs Genéricas HTTPS: Usadas para pasar la validación estricta de 'back_urls'.
const SUCCESS_URL = "https://www.mercadopago.com/checkout/v1/success"; 
const FAILURE_URL = "https://www.mercadopago.com/checkout/v1/failure";
const PENDING_URL = "https://www.mercadopago.com/checkout/v1/pending";

// URL de Notificación (Webhook): Debe tener formato de dominio público.
// MP lo aceptará en Sandbox, aunque no pueda contactarlo.
const NOTIFICATION_URL = "https://tuhotel.com/api/notificaciones-mp"; 

// La URL de redirección final al frontend (usando 127.0.0.1 para compatibilidad local).
const FRONTEND_URL = "http://127.0.0.1:8080/index.html"; 


// --- Lógica Central: Algoritmo de Disponibilidad (Async SQL) ---
const isAvailable = async (llegadaStr, salidaStr, tipo) => {
    const query = `
        SELECT id FROM reservas
        WHERE habitacionTipo = ?
        AND llegada < ?  
        AND salida > ?   
        LIMIT 1;
    `;
    
    try {
        console.log(`[DB] Verificando disponibilidad para Tipo: ${tipo}, Fechas: ${llegadaStr} a ${salidaStr}`);
        const [rows] = await pool.execute(query, [tipo, salidaStr, llegadaStr]);
        const disponible = rows.length === 0;
        console.log(`[DB] Resultado de la verificación: ${disponible ? 'DISPONIBLE' : 'NO DISPONIBLE'}`);
        return disponible;
    } catch (error) {
        console.error("❌ [DB] Error al verificar disponibilidad:", error.message);
        return false;
    }
};


// ------------------------------------------------------------------
// ENDPOINT 1: VERIFICAR DISPONIBILIDAD (POST /api/verificar-reserva)
// ------------------------------------------------------------------
router.post('/verificar-reserva', async (req, res) => {
    console.log("➡️ [API] Recibida petición en /verificar-reserva");
    const { llegada, salida, tipo } = req.body;

    if (!llegada || !salida || !tipo) {
        return res.status(400).json({ error: 'Faltan datos de la reserva.' });
    }

    const disponible = await isAvailable(llegada, salida, tipo);
    const precioEjemplo = tipo === 'lujo' ? 500 : 300; 

    res.json({ disponible, precio: precioEjemplo });
});


// ------------------------------------------------------------------
// ENDPOINT 2: CREAR PREFERENCIA DE PAGO EN MERCADO PAGO (POST /api/crear-pago-mp)
// ------------------------------------------------------------------
router.post('/crear-pago-mp', async (req, res) => {
    console.log("➡️ [API] Recibida petición en /crear-pago-mp");
    const { llegada, salida, tipo, nombre, email } = req.body;
    
    const disponible = await isAvailable(llegada, salida, tipo);
    if (!disponible) {
        return res.status(409).json({ error: 'La habitación ya no está disponible.' });
    }

    const precioUnitario = tipo === 'lujo' ? 500 : 300; 
    const externalReference = `${tipo}-${llegada}-${salida}-${Date.now()}`;
    
    let preferenceData = { 
        items: [
            {
                title: `Reserva Hotel Paradiso: Habitación ${tipo.toUpperCase()}`,
                unit_price: precioUnitario,
                quantity: 1,
            }
        ],
        payer: { name: nombre, email: email },
        
        // Uso de URLs de prueba seguras y las claves en MAYÚSCULAS
        back_urls: {
            SUCCESS: SUCCESS_URL, 
            FAILURE: FAILURE_URL,
            PENDING: PENDING_URL 
        },
        auto_return: "approved", 
        external_reference: externalReference, 
        
        // Uso del dominio de prueba válido
        notification_url: NOTIFICATION_URL,
    };

    console.log(`[MP] Creando preferencia con External Ref: ${externalReference}`);

    try {
        const mpResponse = await preference.create({ body: preferenceData });
        
        console.log(`[MP] Preferencia creada con ID: ${mpResponse.id}. Redirigiendo a: ${mpResponse.init_point}`);

        res.json({ initPoint: mpResponse.init_point });

    } catch (error) {
        console.error('❌ [MP_ERROR] Error al crear preferencia. Mensaje:', error.message);
        res.status(500).json({ error: 'Error al iniciar el pago. Verifique el Access Token y credenciales de Mercado Pago.' });
    }
});


// ------------------------------------------------------------------
// ENDPOINT 3: MANEJAR RESPUESTA DE MERCADO PAGO (PAGO EXITOSO)
// ------------------------------------------------------------------
// Este endpoint es llamado por Mercado Pago después de la URL genérica.
router.get('/pago/success', async (req, res) => {
    console.log(`➡️ [API] Recibido retorno de pago exitoso. Redirigiendo al frontend...`);
    
    // Redirigimos al frontend REAL para mostrar el estado.
    res.redirect(`${FRONTEND_URL}?pago=exitoso&ref=${req.query.payment_id}`); 
});


// ------------------------------------------------------------------
// ENDPOINT 4: MANEJO DE WEBHOOK (La lógica de guardado debe ser aquí)
// ------------------------------------------------------------------
router.post('/notificaciones-mp', async (req, res) => {
    console.log("🔔 [MP NOTIFICATION] Recibida notificación de Mercado Pago.");
    
    // NOTA: En un sistema real, aquí se consultaría la API de MP para verificar el pago
    // y luego se GUARDARÍA LA RESERVA en MariaDB.

    res.status(200).send("OK");
});


// ------------------------------------------------------------------
// ENDPOINTS DE FALLO Y PENDIENTE
// ------------------------------------------------------------------
router.get('/pago/failure', (req, res) => {
    console.log(`➡️ [API] Recibido retorno de pago fallido.`);
    res.redirect(`${FRONTEND_URL}?pago=fallido`);
});

router.get('/pago/pending', (req, res) => {
    console.log(`➡️ [API] Recibido retorno de pago pendiente.`);
    res.redirect(`${FRONTEND_URL}?pago=pendiente`);
});


module.exports = router;