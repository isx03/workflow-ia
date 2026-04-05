import os
import sys
import json
from fastapi import FastAPI, Request, HTTPException
from dotenv import load_dotenv

# 1. Configurar variables de entorno BASE para que los imports no fallen
os.environ.setdefault('USERS_TABLE_NAME', 'workflow-ia-users-dev')
os.environ.setdefault('RESULTS_TABLE_NAME', 'workflow-ia-resultados-dev')
os.environ.setdefault('S3_BUCKET_NAME', 'workflow-ia-files-localdev')
os.environ.setdefault('GROQ_API_KEY', 'dummy_key')
os.environ.setdefault('SENDGRID_API_KEY', 'dummy_key')

# Intentar cargar .env de la carpeta workflow
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'workflow', '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# 2. Inyectar carpeta workflow al sistema para importar
workflow_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'workflow')
sys.path.append(workflow_dir)

import auth
import api
import step_functions

app = FastAPI(title="Workflow IA - Servidor de Pruebas Local")

# Función auxiliar para convertir Response de Lambda a Respuesta FastAPI
def lambda_to_fastapi(response: dict):
    from fastapi.responses import JSONResponse
    status_code = response.get('statusCode', 200)
    body_str = response.get('body', '{}')
    return JSONResponse(status_code=status_code, content=json.loads(body_str))

@app.post("/register")
async def route_register(request: Request):
    body = await request.body()
    event = {
        "body": body.decode('utf-8')
    }
    response = auth.register(event, None)
    return lambda_to_fastapi(response)

@app.post("/login")
async def route_login(request: Request):
    body = await request.body()
    event = {
        "body": body.decode('utf-8')
    }
    response = auth.login(event, None)
    return lambda_to_fastapi(response)

@app.get("/results")
async def route_list_results(request: Request):
    # API Gateway manda los headers planos
    event = {
        "headers": dict(request.headers)
    }
    response = api.list_results(event, None)
    return lambda_to_fastapi(response)

@app.post("/workflow")
async def route_workflow(request: Request):
    body = await request.body()
    event = {
        "headers": dict(request.headers),
        "body": body.decode('utf-8')
    }
    response = api.start_workflow(event, None)
    return lambda_to_fastapi(response)

# ==============================================================
# ENDPOINTS DE PASOS INDIVIDUALES (Simulación de Step Functions)
# ==============================================================

@app.post("/step/evaluate_file")
async def step_evaluate_file(payload: dict):
    """
    Recibe el payload desencadenado para ejecutar el Evaluador de Groq
    """
    try:
        # Step functions resuelven de payload dict plano a output dict plano
        result = step_functions.evaluate_file(payload, None)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/step/save_result")
async def step_save_result(payload: dict):
    """
    Guarda los resultados estructurados del AI en DynamoDB
    """
    try:
        result = step_functions.save_result(payload, None)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/step/generate_report")
async def step_generate_report(payload: dict):
    """
    Genera el reporte final en AWS S3
    """
    try:
        result = step_functions.generate_report(payload, None)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/step/send_email")
async def step_send_email(payload: dict):
    """
    Envía el email vía SendGrid
    """
    try:
        result = step_functions.send_email(payload, None)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
