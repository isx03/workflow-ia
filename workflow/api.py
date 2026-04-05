import json
import os
import boto3
import jwt
import base64
import time
import datetime
import io
import pypdf
import urllib.request
import re
from boto3.dynamodb.conditions import Key
dynamodb = boto3.resource('dynamodb')
results_table = dynamodb.Table(os.environ['RESULTS_TABLE_NAME'])
stepfunctions = boto3.client('stepfunctions')
state_machine_arn = os.environ.get('WORKFLOW_STATE_MACHINE_ARN')
jwt_secret = os.environ.get('JWT_SECRET', 'secret123')

def format_to_markdown(raw_text):
    """
    Versión simple pero efectiva para PDFs con estructura clara.
    """
    # Limpiar caracteres corruptos (preservando los saltos de línea \n y retornos \r)
    text = re.sub(r'[\x00-\x09\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', raw_text)
    text = text.replace('•', '-')
    
    lines = text.split('\n')
    result = []
    
    for line in lines:
        line = line.strip()
        if not line:
            result.append('')
            continue
        
        # Títulos principales (mayúsculas + largo)
        if line.isupper() and len(line) > 10 and 'S/' not in line:
            result.append(f'\n## {line}')
        
        # Subtítulos numerados (1., 2., etc.)
        elif re.match(r'^\d+\.', line):
            result.append(f'\n### {line}')
        
        # Secciones conocidas (agrega más si necesitas)
        elif line in ['Datos del Titular', 'Resumen Financiero', 'Historial de Pagos', 
                      'Alertas y Observaciones', 'Evaluación General', 'Nota']:
            result.append(f'\n## {line}')
        
        # Campos clave: valor
        elif ':' in line and not line.startswith('-'):
            parts = line.split(':', 1)
            result.append(f'- **{parts[0].strip()}:** {parts[1].strip()}')
        
        # Listas (ya con -)
        elif line.startswith('-'):
            result.append(line)
        
        # Tabla (detecta la línea de encabezado)
        elif 'Mes' in line and 'Estado' in line:
            result.append(line)
            result.append('| --- | --- | --- |')
        
        # Todo lo demás (párrafos normales)
        else:
            result.append(line)
    
    return '\n'.join(result)

def generate_response(status_code, body):
    return {
        "statusCode": status_code,
        "body": json.dumps(body),
        "headers": {
            "Content-Type": "application/json"
        }
    }

def get_user_from_token(event):
    headers = event.get('headers', {})
    auth_header = headers.get('authorization') or headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise Exception("Missing or invalid token")
    token = auth_header.split(' ')[1]
    decoded = jwt.decode(token, jwt_secret, algorithms=['HS256'])
    return decoded

def list_results(event, context):
    try:
        user = get_user_from_token(event)
        user_id = user['id']

        response = results_table.query(
            KeyConditionExpression=Key('userId').eq(user_id)
        )
        return generate_response(200, {"results": response.get('Items', [])})

    except Exception as e:
        print(e)
        return generate_response(401, {"message": str(e)})

def start_workflow(event, context):
    try:
        user = get_user_from_token(event)
        user_email = user['email']
        user_id = user['id']

        s3_instructions_path = os.environ.get('S3_INSTRUCTIONS_PATH', 's3://iafg-cdia-cloud-computing/final-project-workflow/agente-seleccionador-inquilinos.md')

        body = json.loads(event.get('body', '{}'))
        instructions_path = body.get('instructions_path', s3_instructions_path)
        files = body.get('files', [])

        if not files:
            return generate_response(400, {"message": "files array is required"})

        s3_tenants_path = os.environ.get('S3_TENANTS_PATH', 's3://iafg-cdia-cloud-computing/final-project-workflow/tenants/')
        
        target_bucket = ''
        target_prefix = "tenants/"
        
        if s3_tenants_path.startswith('s3://'):
            path_without_scheme = s3_tenants_path[5:]
            if '/' in path_without_scheme:
                target_bucket, target_prefix = path_without_scheme.split('/', 1)
            else:
                target_bucket = path_without_scheme
                target_prefix = ""
        
        if target_prefix and not target_prefix.endswith('/'):
            target_prefix += '/'

        s3_client = boto3.client('s3')
        executions = []

        for f in files:
            try:
                file_name = f.get('file_name') or f.get('name')
                content_b64 = f.get('content_base64')
                if not file_name or not content_b64:
                    continue

                pdf_bytes = base64.b64decode(content_b64)
                
                # Extraer texto del PDF
                reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
                raw_text_content = ""
                for page in reader.pages:
                    raw_text_content += page.extract_text() + "\n"

                # Estructurar via IA
                text_content = format_to_markdown(raw_text_content)

                # Generar timestamp con microsegundos
                now = datetime.datetime.now()
                timestamp = now.strftime("%Y%m%d_%H%M%S_%f")
                
                clean_name = file_name.replace('.pdf', '')
                base_new_name = f"{timestamp}_{clean_name}"
                
                pdf_s3_key = f"{target_prefix}{base_new_name}.pdf"
                md_s3_key = f"{target_prefix}{base_new_name}.md"
                
                # Subir el archivo PDF
                s3_client.put_object(
                    Bucket=target_bucket,
                    Key=pdf_s3_key,
                    Body=pdf_bytes,
                    ContentType='application/pdf'
                )
                
                # Subir el archivo .md
                s3_client.put_object(
                    Bucket=target_bucket,
                    Key=md_s3_key,
                    Body=text_content.encode('utf-8'),
                    ContentType='text/markdown'
                )
                
                # Ejecutar Step Function usando el archivo .md como fuente de texto
                input_payload = {
                    "user_id": user_id,
                    "user_email": user_email,
                    "file_path": f"s3://{target_bucket}/{md_s3_key}",
                    "instructions_path": instructions_path
                }

                response = stepfunctions.start_execution(
                    stateMachineArn=state_machine_arn,
                    input=json.dumps(input_payload)
                )
                executions.append(response.get('executionArn'))
            except Exception as loop_e:
                print(f"File skipped due to error processing {f.get('file_name', 'unknown')}: {loop_e}")

        if len(executions) == 0:
            return generate_response(400, {"message": "No valid files processed"})

        return generate_response(202, {
            "message": f"Workflow started successfully for {len(executions)} files",
            "executionArns": executions
        })

    except Exception as e:
        print(e)
        return generate_response(500, {"message": str(e)})
