const { MercadoPagoConfig } = require('mercadopago');

const ACCESS_TOKEN = 'TEST-4458556438663854-120520-63d77e3ec6f251c9dbcca00bf9331944-116640131'; 

// 1. Creamos y exportamos una nueva instancia de la clase de configuración
const client = new MercadoPagoConfig({ 
    accessToken: ACCESS_TOKEN,
    options: { 
        timeout: 5000,
        // *** AGREGAR ESTA OPCIÓN PARA FORZAR EL AMBIENTE DE PRUEBA ***
        // Esto le indica al SDK que trabaje en el dominio de Sandbox
        integratorId: null, // Si tienes un ID de integrador, úsalo aquí. Si no, null.
        platform: null 
    } 
});

// 2. Exportamos la instancia para usarla en rutas/reservas.js
module.exports = client;