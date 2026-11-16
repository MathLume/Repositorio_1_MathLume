'use strict';
/* ==========================================================
   MathLume — porta de entrada da API no Vercel
   Toda chamada /api/... chega aqui (ver ../vercel.json) e é
   repassada para as mesmas rotas do MathLume/Backend/server.js.
   No PC continua valendo o "npm start" dentro de MathLume/Backend/.
   ========================================================== */
const { apiVercel } = require('../MathLume/Backend/server');

module.exports = (req, res) => apiVercel(req, res);
