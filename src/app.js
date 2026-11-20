const express = require('express');

function createApp({ db }) {
if (!db || typeof db.execute !== 'function') {
throw new Error('La aplicación necesita una conexión de base de datos válida.');
}

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
res.status(200).json({
status: 'ok',
mensaje: 'La API de libros está funcionando',
version: process.env.APP_VERSION || 'desarrollo'
});
});

app.get('/libros', async (req, res, next) => {
try {
const [rows] = await db.execute(
'SELECT id, titulo, autor, anio_publicacion FROM libros ORDER BY id'
);
res.status(200).json(rows);
} catch (error) {
next(error);
}
});

app.get('/libros/:id', async (req, res, next) => {
try {
const id = Number(req.params.id);
if (!Number.isInteger(id) || id < 1) {
return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
}
const [rows] = await db.execute(
'SELECT id, titulo, autor, anio_publicacion FROM libros WHERE id = ?', [id]
);
if (rows.length === 0) {
return res.status(404).json({ error: 'Libro no encontrado.' });
}
return res.status(200).json(rows[0]);
} catch (error) {
return next(error);
}
});

app.post('/libros', async (req, res, next) => {
try {
const validation = validateBook(req.body);
if (validation) return res.status(400).json({ error: validation });

const { titulo, autor, anio_publicacion } = req.body;  
  const [result] = await db.execute(  
    'INSERT INTO libros (titulo, autor, anio_publicacion) VALUES (?, ?, ?)',  
    [titulo.trim(), autor.trim(), anio_publicacion]  
  );  
  const [rows] = await db.execute(  
    'SELECT id, titulo, autor, anio_publicacion FROM libros WHERE id = ?',  
    [result.insertId]  
  );  
  return res.status(201).json(rows[0]);  
} catch (error) {  
  return next(error);  
}

});

app.put('/libros/:id', async (req, res, next) => {
try {
const id = Number(req.params.id);
if (!Number.isInteger(id) || id < 1) {
return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
}
const validation = validateBook(req.body);
if (validation) return res.status(400).json({ error: validation });

const { titulo, autor, anio_publicacion } = req.body;  
  const [result] = await db.execute(  
    'UPDATE libros SET titulo = ?, autor = ?, anio_publicacion = ? WHERE id = ?',  
    [titulo.trim(), autor.trim(), anio_publicacion, id]  
  );  
  if (result.affectedRows === 0) {  
    return res.status(404).json({ error: 'Libro no encontrado.' });  
  }  
  const [rows] = await db.execute(  
    'SELECT id, titulo, autor, anio_publicacion FROM libros WHERE id = ?', [id]  
  );  
  return res.status(200).json(rows[0]);  
} catch (error) {  
  return next(error);  
}

});

app.delete('/libros/:id', async (req, res, next) => {
try {
const id = Number(req.params.id);
if (!Number.isInteger(id) || id < 1) {
return res.status(400).json({ error: 'El id debe ser un entero positivo.' });
}
const [result] = await db.execute('DELETE FROM libros WHERE id = ?', [id]);
if (result.affectedRows === 0) {
return res.status(404).json({ error: 'Libro no encontrado.' });
}
return res.status(200).json({ mensaje: 'Libro eliminado correctamente.' });
} catch (error) {
return next(error);
}
});

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

app.use((error, req, res, next) => {
console.error('Error en la API:', error.message);
if (res.headersSent) return next(error);
return res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
});

return app;
}

function validateBook(book) {
if (!book || typeof book !== 'object' || Array.isArray(book)) {
return 'Se debe enviar un objeto con los datos del libro.';
}
if (typeof book.titulo !== 'string' || book.titulo.trim() === '') {
return 'El título no puede estar vacío.';
}
if (typeof book.autor !== 'string' || book.autor.trim() === '') {
return 'El autor no puede estar vacío.';
}
if (!Number.isInteger(book.anio_publicacion) || book.anio_publicacion < 0) {
return 'El año de publicación debe ser un número entero válido.';
}
return null;
}

module.exports = { createApp, validateBook };
