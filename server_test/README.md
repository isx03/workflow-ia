# Servidor Local FastAPI de Pruebas

Esta carpeta contiene una capa API REST montada sobre el código AWS Lambda de la carpeta principal `workflow`. Te permite levantar y usar la lógica backend de tu proyecto de forma local sin necesidad de subirlo constantemente a AWS. 

> Funciona inyectando los eventos HTTP locales (`Request`) directamente en la sintaxis nativa AWS usando importación dinámica en Python.

## Pasos para ejecutar

**1. Instalar dependencias locales**
Es altamente recomendable usar un entorno virtual. Ejecuta desde la raíz del proyecto o dentro de esta misma carpeta:

```bash
pip install -r requirements.txt
```

**2. Configurar Variables de Entorno (.env)**
La aplicación intentará buscar y cargar tu archivo mágico `workflow/.env` automáticamente. Asegúrate de tenerlo configurado conteniendo tus llaves de **AWS (Opcional, si tienes SSO asume por defecto), GROQ_API_KEY y SENDGRID_API_KEY**. Si no lo encuentra usará valores 'dummy'.

**3. Iniciar el servidor**
Desde la carpeta raíz del proyecto, o ubicándote en la carpeta `server_test`, enciende Uvicorn:

```bash
uvicorn server_test.main:app --reload
```

Si todo va bien, verás en la consola `Application startup complete` y tu servidor despachará llamadas en `http://127.0.0.1:8000`.

## Documentación Autogenerada

Dado que usamos FastAPI, puedes visitar directamente http://127.0.0.1:8000/docs en tu computadora para ver la interfaz gráfica interactiva de Swagger UI que FastAPI te genera y hacer pruebas allí mismo.

También cuentas con un archivo `fastapi_postman_collection.json` en este directorio para importar la colección completa al cliente y tener todo listo.
