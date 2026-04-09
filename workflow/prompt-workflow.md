## Rol / Persona
Actua como un experto en crear Agentes de IA con servicios de AWS

## Contexto
Se necesita construir un Workflow que use IA y que sea completamente serverless

## Tarea / Objetivo
Craer los siguientes endpoints:
1. Registro de usuario
Recibe como parametro:
- Nombre
- Email
- Contraseña
Debe validar que el usuario no exista en la tabla dynamodb.
Debe encriptar la contraseña utilizando bcrypt.
Debe guardarlo en una tabla dynamodb.

2. Login de usuario
Recibe como parametro:
- Email
- Contraseña
Debe validar que el usuario exista en la tabla dynamodb.
Debe validar que la contraseña sea correcta.
Debe retornar un json web token (JWT).

3. Listado de resultados
Debe recibir el jwt y de ahí extraer el id del usuario logeado.
Debe retornar un listado de todos los resultados obtenidos por el usuario logeado.

Crea un workflow que use IA con estas funcionalidades:
- Pasos:
  1. Recibe como entrada estos datos:
  - Nombre de inquilino
  - Archivo pdf o md
  2. Usar la ruta del archivo pdf o md para obtener el contenido, usar la ruta del archivo de instrucciones para obtener las instrucciones y generar un prompt con las instrucciones y contenido y enviarlo al Api IA de Groq
  3. El resultado del Api Agente IA generica (formato json), junto al nombre del inquilino, id del usuario logeado y la fecha y hora actual debe guardarlo en una tabla dynamodb.
  4. Debe generar un archivo en formato CSV con campos separados por punto y coma (;) y una tabla comparativa con el resultado del Api almacenarlo en el bucket en una carpeta "resultados-workflow".
  5. Debe enviar un correo, al correo del usuario logeado, utilizando el Api de SendGrid adjuntando el archivo CSV anterior y un diseño estandar, similar a un mailing marketing, con el resultado del Api.

## Requisitos de la respuesta
- Para la IaC (Infraestructura como codigo) utiliza el framework serverless version 4 con rol de IAM LabRole existente.
- Para el workflow utiliza:
  - Servicios de AWS (Api Gateway, Step Functions, DynamoDB, Lambda). Genera un endpoint en Api Gateway para poder ejecutar el workflow Step Functions de forma asincrona.
  - En caso se necesite crear lambdas utiliza lenguaje de programacion python version 3.14 con libreria urllib en vez de requests en caso se necesite.
- Genera un readme.md con las funcionalidades que contiene y las instrucciones para hacer el despliegue automatico. Adicionalmente indica explicitamente que ha sido creado con GitHub Copilot, el modelo LLM usado, la fecha de creacion e incluye como referencia todo el texto del prompt utilizado.
- Genera una coleccion postman para poder probar el nuevo api creado.

## Requisitos adicionales
- En las tablas de DynamoDB agregar el campo createdAt y updatedAt y registrar la fecha y hora actual en el momento de la creacion y actualizacion.
