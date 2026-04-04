# Workflow IA (Serverless Framework)

Este proyecto implementa una arquitectura orientada a Serverless con AWS (Step Functions, Lambda, DynamoDB, API Gateway, S3) que expone endpoints para validación de usuarios y desencadena un flujo asincrónico por inteligencia artificial, según el documento `prompt-workflow.md`.

## Funcionalidades
1. **Autenticación (API REST)**
   - `/register`: Registra un usuario verificando su existencia y encriptando su clave (bcrypt).
   - `/login`: Devuelve un Token JWT tras validar la clave bcrypt.
   - `/results`: Lista (a través de query) los resultados para el usuario loggeado.
2. **Workflow (API + Step Functions)**
   - `/workflow`: Desencadena el Step Function asíncrónico.
   - **Step 1 (evaluateFile)**: Obtiene un contenido y sus instrucciones correspondientes ambos alojados desde S3, formatea un prompt, y lo manda al API de Groq usando `urllib`.
   - **Step 2 (saveResult)**: Almacena el resultado JSON dentro de una nueva entrada en DynamoDB (con fecha, nombre del inquilino, ID de usuario, y su timestamp).
   - **Step 3 (generateReport)**: Genera un CSV formateado mapeando el JSON obtenido y lo sube al bucket S3 con su respectivo separador por punto y coma (`;`).
   - **Step 4 (sendEmail)**: Convierte ese CSV en una tabla HTML en formato marketing estándar, y manda adjunto dicho archivo al usuario utilizando SendGrid.

## Tecnologías y Herramientas utilizadas
- **Serverless Framework v4**: Facilita la provision de recursos en AWS.
- **Python 3.14**: Especificado en la configuración. *(Aviso: Como AWS no soporta este runtime, serverless tratará de desplegarlo, o puedes requerir ajustarlo a python3.12 si ocurre un error AWS, dado que 3.12 es el limite hoy)*.
- **Urllib**: Standard de python sin necesitar de instalar la suite `requests`.
- **Groq API**: Generador de las respuestas IA.
- **SendGrid**: Emisor transaccional de correos.

## Instrucciones para despliegue
1. Configura tus credenciales de AWS CLI y asume que ya existe el `LabRole` en tu consola o ajustalo en el yaml en caso cambies de entorno.
2. Define las siguientes variables de entorno o cámbialas estáticas por seguridad (Groq / SendGrid):
   - `GROQ_API_KEY`
   - `SENDGRID_API_KEY`
   - `JWT_SECRET`
3. Instala los plugins si serverless lo requiere y luego simplemente lanza:
```bash
serverless deploy --stage dev
```
4. Se publicarán ambos APIs (Gateway) lo cual habilitará la carga en Postman.

> Nota de IA: Todo el código y arquitectura dentro de este repositorio ha sido generado proactivamente para cumplir la tarea utilizando **GitHub Copilot** y el modelo subyacente de agente LLM usado fue **Gemini 3.1 Pro (High)** con fecha de creación: **04 de Abril de 2026**.

## Referencia al Prompt Original (`prompt-workflow.md`)
> ## Rol / Persona
> Actúa como un experto en crear Agentes de IA con servicios de AWS
> 
> ## Contexto
> Se necesita construir un Workflow que use IA y que sea completamente serverless
> 
> ## Tarea / Objetivo
> Crear los siguientes endpoints:
> 1. Registro de usuario. Validar que no exista en dynamodb. Encriptar contraseña con bcrypt. Guardarlo en tabla dynamodb.
> 2. Login de usuario. Validar existe en dynamodb y contraseña. Retornar jwt.
> 3. Listado de resultados usando jwt y de ahí extraer ID usuario loggeado.
> ... [resto del prompt detallado en prompt-workflow.md]

# 5. Instalaciones plugin serverless
```bash
serverless plugin install --name serverless-python-requirements
```