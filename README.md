# EvalTisk - Serverless Application

Este proyecto es una aplicación integral basada en arquitectura Serverless en AWS, orientada a la evaluación y análisis de inquilinos a través de un flujo con IA. 

El código fuente está dividido en dos partes principales:
1. **`frontend`**: Aplicación web frontend en React orientada a la interacción con el usuario.
2. **`workflow`**: Backend serverless que coordina la API y las tareas asíncronas para proveer analítica.

---

## 1. Frontend

El frontend está desarrollado en base a **React**, **Vite** y **Tailwind CSS**. 

### Aspectos Técnicos
- Se ubica dentro del directorio `/frontend`.
- Exige configurar las variables de entorno dentro de `.env` (basadas en `.env.sample`) para enlazar las consultas con la API del backend.
- Scripting convencional de NPM para operar (`npm install`, `npm run dev`, `npm run build`).

### Despliegue en AWS
La delegación y alojamiento en la nube se automatiza usando **[Serverless Framework](https://www.serverless.com/)**. El servicio creará un bucket público S3 configurado para servir una web estática.

**Pasos para desplegar:**
1. Navega al directorio y prepara dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Ejecuta el comando de Serverless (esto ejecutará internamente el build, sincronizará la carpeta `/dist` y creará el Bucket web):
   ```bash
   serverless deploy
   ```

---

## 2. Workflow (Backend)

La columna vertebral construida sobre un entorno Serverless con infraestructura nativa de AWS para la evaluación de archivos e invocación de flujos. Programado en **Python 3.12**.

### Aspectos Técnicos
- Empaquetado dentro de `/workflow`.
- Implementa endpoints HTTP mediante Amazon API Gateway a funciones Lambda para inicio de sesión, registro (auth) y control de workflows.
- Administra el estado y los usuarios utilizando tablas en **Amazon DynamoDB** (UsersTable, WorkflowResultsTable).
- Utiliza **AWS Step Functions** para definir un proceso ordenado de procesamiento de documentos donde suceden una serie de iteraciones (EvaluateFile -> SaveResult -> GenerateReport -> SendEmail).
- Se conecta a proveedores adicionales (Groq SDK, SendGrid).

### Despliegue en AWS
Al igual que el módulo web, en este bloque se definen como código todos los pipelines de despliegue mediante Serverless.

**Pasos para desplegar:**
1. Navega e inicializa el escenario:
   ```bash
   cd workflow
   ```
2. Configura los secretos correspondientes creando un archivo `.env` tomando como partida `.env.sample`.
3. Haz el despliegue del stack en tu cuenta:
   ```bash
   serverless deploy
   ```
   *El framework construirá automáticamente los recursos definidos, incluyendo el pre-compilado de bibliotecas Python usando entornos virtualizados y el mapeo de los roles IAM.*

---

## Requisitos Previos Generales

Para que el proceso de despliegue global no falle, asegúrate de cumplir con:
1. Una cuenta activa de Amazon Web Services (AWS).
2. Credenciales instaladas en `~/.aws/credentials` o definidas a base de variables de sistema (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
3. El rol base `LabRole` existir en tu cuenta. En caso contrario, se debe reemplazar el ARN preestablecido en los `serverless.yml` de cada proyecto por un rol con permisos apropiados para S3, Lambda, Step Functions y DynamoDB.
4. Serverless Framework v4.

---

## 3. Despliegue Mediante Contenedor Docker (Recomendado)

Para evitar problemas ligados a diferencias de dependencias en Node, Python u otras variables globales, el proyecto incluye un entorno Docker preconfigurado mediante `docker-compose.yml` (con Python 3.12 y Serverless Framework v4).

### Ingresar al Contenedor
Asegúrate de contar con [Docker](https://www.docker.com/) instalado. En la raíz del proyecto, ejecuta:

```bash
# Inicia un entorno en /bin/bash construyendo la imagen del servicio serverless
docker-compose run --rm serverless
```
Este comando mapeará tu código local hacia `/app` dentro del contenedor, así como interceptará de forma segura el directorio base `./.aws` en caso lo incluyas (para usar tus credenciales de amazon guardadas ahí localmente bajo `/root/.aws`).

### Comandos de Despliegue Interno
Una vez que el terminal muestre la sesión interactiva virtualizada (`root@...:/app#`), podrás realizar los flujos en un terreno limpio y preparado.

**Desplegar frontend:**
```bash
cd frontend
npm install
serverless deploy
```

**Desplegar workflow (backend):**
```bash
cd workflow
# Pip install es omitible ya que serverless usa serverless-python-requirements 
serverless deploy
```
