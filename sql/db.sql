CREATE DATABASE IF NOT EXISTS biblioteca
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE biblioteca;

CREATE TABLE IF NOT EXISTS libros (
id INT NOT NULL AUTO_INCREMENT,
titulo VARCHAR(200) NOT NULL,
autor VARCHAR(150) NOT NULL,
anio_publicacion INT NOT NULL,
PRIMARY KEY (id)
);

-- Datos de ejemplo para comprobar que la tabla funciona.
INSERT INTO libros (titulo, autor, anio_publicacion) VALUES
('Cien años de soledad', 'Gabriel García Márquez', 1967),
('El principito', 'Antoine de Saint-Exupéry', 1943);
