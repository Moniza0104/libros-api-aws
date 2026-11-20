# API REST de libros en AWS (COM610)

**Segundo examen parcial – Trabajando en la Nube**  
Universidad San Francisco Xavier de Chuquisaca – Semestre 2/2026

## 1. Descripción

Este proyecto implementa una API REST para registrar y administrar libros. Está desarrollada con Node.js y Express, y guarda la información en una base de datos MySQL de Amazon RDS. La aplicación se ejecuta en un contenedor Docker dentro de una instancia Amazon EC2. Nginx recibe las peticiones por el puerto 80 y las envía al contenedor, que escucha únicamente en `127.0.0.1:3000`.

Para la segunda parte se incorporaron pruebas automatizadas con Jest y Supertest, integración continua con GitHub Actions y un flujo de despliegue que publica la imagen en GitHub Container Registry (GHCR) y la instala en EC2. El script de despliegue comprueba la nueva versión y trata de restaurar la anterior si la comprobación falla.

## 2. Tecnologías utilizadas

- Node.js 20 y Express 4.
- Amazon EC2 para ejecutar la aplicación.
- Amazon RDS for MySQL para almacenar los libros.
- Nginx como proxy inverso.
- Docker para empaquetar la aplicación.
- Jest y Supertest para las pruebas.
- GitHub Actions para CI/CD.
- GitHub Container Registry para publicar las imágenes.

## 3. Estructura del repositorio

```text
libros-api/
├── .github/workflows/
│   ├── ci.yml
│   └── cd.yml
├── evidencias/
├── nginx/libros-api.conf
├── scripts/deploy-ec2.sh
├── sql/db.sql
├── src/
│   ├── app.js
│   ├── db.js
│   └── server.js
├── tests/app.test.js
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── package.json
├── package-lock.json
└── README.md
```

## 4. Instalación y ejecución local

Se necesita Node.js 20 o superior y un servidor MySQL disponible. Clonar el repositorio y entrar a su carpeta:

```bash
git clone URL_DE_TU_REPOSITORIO
cd libros-api
npm install
```

Crear un archivo `.env` copiando `.env.example` y colocar los datos de una base MySQL de desarrollo. No subir ese archivo a GitHub.

```bash
cp .env.example .env
```

Crear la base y la tabla ejecutando el contenido de `sql/db.sql` en MySQL. Después iniciar la API:

```bash
npm start
```

La API quedará disponible en `http://localhost:3000`. Para desarrollo se puede utilizar `npm run dev`.

> Antes de entregar, ejecutar `npm install` y subir el `package-lock.json` generado por npm. El entorno de preparación de este archivo no tuvo acceso al registro de paquetes de npm, por lo que el archivo de bloqueo debe generarse en un equipo con conexión a Internet. Después comprobar `npm ci` y `npm test`.

## 5. Endpoints disponibles

La API utiliza JSON para recibir y responder información.

| Método | Ruta | Función | Respuesta principal |
|---|---|---|---|
| GET | `/health` | Comprueba que la API esté activa | 200 |
| GET | `/libros` | Lista todos los libros | 200 |
| GET | `/libros/:id` | Busca un libro por su ID | 200 o 404 |
| POST | `/libros` | Registra un libro | 201 o 400 |
| PUT | `/libros/:id` | Modifica un libro | 200, 400 o 404 |
| DELETE | `/libros/:id` | Elimina un libro | 200, 400 o 404 |

Ejemplo de JSON para crear o actualizar un libro:

```json
{
  "titulo": "El principito",
  "autor": "Antoine de Saint-Exupéry",
  "anio_publicacion": 1943
}
```

El título y el autor no pueden estar vacíos. El año debe ser un número entero no negativo. Las consultas SQL utilizan parámetros `?` para evitar concatenar directamente los datos recibidos en las sentencias.

Pruebas manuales de ejemplo (reemplazar la dirección por la URL real):

```bash
curl http://localhost:3000/health
curl http://localhost:3000/libros
curl -X POST http://localhost:3000/libros \
  -H 'Content-Type: application/json' \
  -d '{"titulo":"El principito","autor":"Antoine de Saint-Exupéry","anio_publicacion":1943}'
curl http://localhost:3000/libros/1
curl -X PUT http://localhost:3000/libros/1 \
  -H 'Content-Type: application/json' \
  -d '{"titulo":"El principito - edición nueva","autor":"Antoine de Saint-Exupéry","anio_publicacion":1943}'
curl -X DELETE http://localhost:3000/libros/1
```

## 6. Configuración de AWS (Ejercicio 1)

Los nombres y valores de esta sección son ejemplos. Se deben reemplazar por los recursos creados en la cuenta del estudiante.

### 6.1. Red y grupos de seguridad

1. En AWS, seleccionar una región y utilizar una VPC. Crear una instancia EC2 Linux y una instancia RDS MySQL dentro de esa misma VPC.
2. Identificar los recursos con las iniciales del estudiante, por ejemplo `pepito-libros-ec2` y `pepito-libros-rds`.
3. Crear un grupo de seguridad para EC2 con estas reglas de entrada:
   - SSH TCP 22: únicamente la IP pública propia, con máscara `/32`.
   - HTTP TCP 80: `0.0.0.0/0` (y `::/0` si se habilita IPv6).
   - No crear una regla pública para el puerto 3000.
4. Crear otro grupo de seguridad para RDS. Desactivar **Public access / Publicly accessible**. Su única regla de entrada debe ser MySQL TCP 3306 con origen igual al grupo de seguridad de EC2, no una dirección abierta de Internet.
5. Asignar ambos recursos a la misma VPC. Para RDS, utilizar un DB subnet group de subredes privadas cuando la configuración de la cuenta lo permita.

### 6.2. Crear la base de datos

En la creación de RDS seleccionar MySQL, definir usuario y contraseña propios, guardar el endpoint y asociar el grupo de seguridad de RDS. Desde una terminal de EC2 instalar el cliente MySQL si hace falta y ejecutar:

```bash
mysql -h ENDPOINT_RDS -P 3306 -u USUARIO_RDS -p
```

Dentro de MySQL ejecutar el archivo `sql/db.sql` (se puede copiar a EC2 con `scp`) o pegar sus sentencias. Verificar la tabla:

```sql
USE biblioteca;
SHOW TABLES;
SELECT * FROM libros;
```

### 6.3. Preparar EC2

Los siguientes comandos son para Amazon Linux 2023. Si se utiliza Ubuntu, instalar Docker y Nginx con el gestor de paquetes correspondiente.

```bash
sudo dnf update -y
sudo dnf install -y docker nginx mariadb105
sudo systemctl enable --now docker
sudo systemctl enable --now nginx
sudo usermod -aG docker ec2-user
```

Cerrar la sesión SSH y volver a entrar para que se aplique el grupo `docker`. Crear el directorio de despliegue y el archivo de configuración:

```bash
sudo mkdir -p /opt/libros-api
sudo chown ec2-user:ec2-user /opt/libros-api
nano /opt/libros-api/.env
```

Contenido de `/opt/libros-api/.env` (usar valores reales solo dentro de EC2):

```env
DB_HOST=endpoint-real-de-rds
DB_PORT=3306
DB_USER=usuario-real
DB_PASSWORD=contraseña-real
DB_NAME=biblioteca
DB_CONNECTION_LIMIT=5
PORT=3000
```

Este archivo no se copia al repositorio ni se incorpora a la imagen Docker. Desde el equipo local, copiar el script a EC2 (ajustar el nombre de la clave y la dirección):

```bash
scp -i "mi-clave.pem" scripts/deploy-ec2.sh ec2-user@IP_PUBLICA_EC2:/opt/libros-api/deploy.sh
```

En EC2, ejecutar `chmod +x /opt/libros-api/deploy.sh`. El script necesita `curl` y Docker. También se puede copiar la configuración de Nginx desde el equipo local:

```bash
scp -i "mi-clave.pem" nginx/libros-api.conf ec2-user@IP_PUBLICA_EC2:/tmp/libros-api.conf
sudo mv /tmp/libros-api.conf /etc/nginx/conf.d/libros-api.conf
```

Configurar Nginx copiando `nginx/libros-api.conf` a `/etc/nginx/conf.d/libros-api.conf`:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Nginx publica el servicio por el puerto 80 y reenvía las peticiones a `127.0.0.1:3000`. El puerto 3000 no se abre en el grupo de seguridad.

## 7. Pruebas automatizadas (Ejercicio 2)

Las pruebas están en `tests/app.test.js`. Se utiliza un objeto falso (mock) para simular la capa de datos; por eso no es necesario conectarse a RDS para ejecutar las pruebas. Se comprueban `/health`, la creación de un libro, el rechazo de datos inválidos, la consulta de un ID inexistente y otras operaciones.

```bash
npm ci
npm test
```

El comando `npm test` devuelve un código distinto de cero si alguna prueba falla. Esto hace que GitHub Actions marque el trabajo como fallido.

## 8. Docker

Construir y ejecutar la imagen localmente:

```bash
docker build -t libros-api:local .
docker run --rm -p 3000:3000 --env-file .env libros-api:local
```

Comprobar en otra terminal:

```bash
curl http://localhost:3000/health
```

La imagen no contiene credenciales. La conexión a RDS se configura al iniciar el contenedor mediante variables de entorno.

## 9. Integración continua y despliegue continuo

### 9.1. CI

`.github/workflows/ci.yml` se ejecuta en cada `push` y `pull_request` hacia `main`. Descarga el repositorio, configura Node 20, ejecuta `npm ci` y `npm test`. Si una prueba falla, la ejecución termina como fallida.

### 9.2. CD

`.github/workflows/cd.yml` se ejecuta únicamente con cambios que llegan a `main`. Los trabajos dependen unos de otros: primero pruebas, después construcción y publicación de la imagen en GHCR con el SHA del commit, y finalmente despliegue por SSH a EC2. Un `pull_request` no activa este workflow.

En GitHub, abrir **Settings → Secrets and variables → Actions** y crear estos repository secrets:

| Secret | Valor |
|---|---|
| `EC2_HOST` | IP pública o DNS de la instancia EC2 |
| `EC2_USER` | Usuario SSH, por ejemplo `ec2-user` |
| `EC2_SSH_KEY` | Contenido completo de la clave privada PEM de acceso SSH |

La clave privada se guarda únicamente como secret y nunca se sube al repositorio. El workflow utiliza `GITHUB_TOKEN` para publicar la imagen en GHCR.

**Importante sobre GHCR:** después de la primera publicación, entrar al paquete creado en GitHub → **Package settings** y cambiar su visibilidad a **Public**, para que EC2 pueda descargarlo sin guardar otra credencial. Si la organización impide paquetes públicos, se debe configurar autenticación de solo lectura en EC2 antes del despliegue.

En EC2 debe existir `/opt/libros-api/.env` y `/opt/libros-api/deploy.sh` antes de ejecutar el CD. El script descarga la imagen, prueba primero el contenedor en el puerto local 3001 consultando `/health` y `/libros`, y luego cambia el contenedor que atiende el puerto local 3000. Vuelve a consultar ambos endpoints. Si la verificación final falla, intenta restaurar el contenedor anterior y termina con error para que GitHub Actions lo indique.

### 9.3. Verificación

Cuando termine el workflow, consultar desde el equipo local:

```bash
curl http://IP_PUBLICA_EC2/health
curl http://IP_PUBLICA_EC2/libros
```

La respuesta de `/health` incluye el campo `version`, que permite identificar el SHA de la imagen desplegada. También se debe revisar la salida del workflow de GitHub Actions y guardar el enlace de la ejecución exitosa.

## 10. Datos que se completan para la entrega

- Repositorio: `PEGAR_URL_PUBLICA_DEL_REPOSITORIO`
- URL de la API: `http://IP_PUBLICA_EC2`
- Ejecución exitosa de CI: `PEGAR_ENLACE_DE_GITHUB_ACTIONS`
- Ejecución exitosa de CD: `PEGAR_ENLACE_DE_GITHUB_ACTIONS`
- Región AWS: `COMPLETAR`
- Identificador de EC2: `COMPLETAR`
- Identificador de RDS: `COMPLETAR`

## 11. Evidencias

Guardar las capturas reales dentro de `evidencias/`. La lista de capturas solicitadas está en `evidencias/LEEME.md`. Antes de publicar, revisar que no aparezcan contraseñas, tokens, claves privadas ni archivos `.env`.

## 12. Limpieza de recursos

Mantener EC2 y RDS activos mientras el docente realiza la revisión. Una vez finalizada, eliminar los recursos que ya no se necesiten para evitar cargos de AWS. Antes de eliminar RDS, exportar o respaldar cualquier dato que se quiera conservar.
