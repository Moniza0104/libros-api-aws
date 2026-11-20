const request = require('supertest');
const { createApp } = require('../src/app');

function createFakeDb() {
  return {
    execute: jest.fn(async (sql, params = []) => {
      if (sql.startsWith('SELECT') && sql.includes('WHERE id = ?')) {
        const id = params[0];
        return [id === 7 ? [{ id: 7, titulo: 'El principito', autor: 'Antoine de Saint-Exupéry', anio_publicacion: 1943 }] : []];
      }
      if (sql.startsWith('SELECT')) return [[{ id: 7, titulo: 'El principito', autor: 'Antoine de Saint-Exupéry', anio_publicacion: 1943 }]];
      if (sql.startsWith('INSERT')) return [{ insertId: 7 }];
      if (sql.startsWith('UPDATE')) return [{ affectedRows: params[3] === 7 ? 1 : 0 }];
      if (sql.startsWith('DELETE')) return [{ affectedRows: params[0] === 7 ? 1 : 0 }];
      return [[]];
    })
  };
}

describe('API de libros', () => {
  let db;
  let app;
  beforeEach(() => {
    db = createFakeDb();
    app = createApp({ db });
  });

  test('GET /health responde que el servicio está activo', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('POST /libros crea un libro válido', async () => {
    const response = await request(app).post('/libros').send({
      titulo: 'El principito', autor: 'Antoine de Saint-Exupéry', anio_publicacion: 1943
    });
    expect(response.status).toBe(201);
    expect(response.body.id).toBe(7);
    expect(db.execute).toHaveBeenCalledWith(
      'INSERT INTO libros (titulo, autor, anio_publicacion) VALUES (?, ?, ?)',
      ['El principito', 'Antoine de Saint-Exupéry', 1943]
    );
  });

  test('POST /libros rechaza datos inválidos', async () => {
    const response = await request(app).post('/libros').send({
      titulo: '   ', autor: 'Autor', anio_publicacion: 'mil novecientos'
    });
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    expect(db.execute).not.toHaveBeenCalled();
  });

  test('GET /libros/:id responde 404 cuando el libro no existe', async () => {
    const response = await request(app).get('/libros/99');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Libro no encontrado.');
  });

  test('GET /libros devuelve la lista de libros', async () => {
    const response = await request(app).get('/libros');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('PUT /libros/:id actualiza un libro existente', async () => {
    const response = await request(app).put('/libros/7').send({
      titulo: 'El principito - edición nueva', autor: 'Antoine de Saint-Exupéry', anio_publicacion: 1943
    });
    expect(response.status).toBe(200);
  });

  test('DELETE /libros/:id elimina un libro existente', async () => {
    const response = await request(app).delete('/libros/7');
    expect(response.status).toBe(200);
  });
});
