import json
import os
import traceback
import boto3
import jwt
import base64
import time
import datetime
import io
import pdfplumber
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

def parse_multipart_data(body_bytes, content_type):
    """Parsea multipart/form-data manualmente preservando bytes exactos."""
    import cgi

    _, params = cgi.parse_header(content_type)
    boundary = params.get('boundary', '').encode('utf-8')

    if not boundary:
        return [], {}

    files = []
    form_fields = {}

    # Separar las partes usando el boundary
    parts = body_bytes.split(b'--' + boundary)

    for part in parts[1:]:  # Saltar el preámbulo
        stripped = part.strip()
        if stripped == b'--' or stripped == b'':
            continue

        # Separar headers del body
        if b'\r\n\r\n' in part:
            header_data, body_data = part.split(b'\r\n\r\n', 1)
        elif b'\n\n' in part:
            header_data, body_data = part.split(b'\n\n', 1)
        else:
            continue

        # Remover trailing CRLF del body
        if body_data.endswith(b'\r\n'):
            body_data = body_data[:-2]
        elif body_data.endswith(b'\n'):
            body_data = body_data[:-1]

        # Parsear Content-Disposition del header
        headers_str = header_data.decode('utf-8', errors='replace')
        cd_match = re.search(r'Content-Disposition:\s*form-data;([^\r\n]+)', headers_str, re.IGNORECASE)

        if not cd_match:
            continue

        _, cd_params = cgi.parse_header('form-data;' + cd_match.group(1))
        name = cd_params.get('name', '')
        filename = cd_params.get('filename')

        if filename:
            # Archivo: preservar bytes exactos
            files.append({'file_name': filename, 'content': body_data})
        else:
            # Campo de texto
            form_fields[name] = body_data.decode('utf-8', errors='replace')

    return files, form_fields


def start_workflow(event, context):
    try:
        user = get_user_from_token(event)
        user_email = user['email']
        user_id = user['id']

        s3_instructions_path = os.environ.get('S3_INSTRUCTIONS_PATH')

        headers = event.get('headers', {})
        content_type = headers.get('content-type', '')

        # Decodificar body (API Gateway base64-encode el body para payloads binarios)
        raw_body = event.get('body', '')
        if event.get('isBase64Encoded', False):
            body_bytes = base64.b64decode(raw_body)
        else:
            body_bytes = raw_body.encode('utf-8') if isinstance(raw_body, str) else raw_body

        files = []
        instructions_path = s3_instructions_path

        if 'multipart/form-data' in content_type:
            # --- Modo form-data: archivos subidos directamente ---
            parsed_files, form_fields = parse_multipart_data(body_bytes, content_type)
            files = parsed_files
            instructions_path = form_fields.get('instructions_path', s3_instructions_path)
            # email_send opcional: reemplaza el email del token
            email_send = form_fields.get('email_send', '').strip()
            if email_send:
                user_email = email_send
        else:
            # --- Modo JSON (backward compatible) ---
            body_json = json.loads(raw_body)
            instructions_path = body_json.get('instructions_path', s3_instructions_path)
            # email_send opcional: reemplaza el email del token
            email_send = body_json.get('email_send', '').strip()
            if email_send:
                user_email = email_send
            for f in body_json.get('files', []):
                file_name = f.get('file_name') or f.get('name')
                content_b64 = f.get('content_base64')
                if file_name and content_b64:
                    files.append({
                        'file_name': file_name,
                        'content': base64.b64decode(content_b64)
                    })

        if not files:
            return generate_response(400, {"message": "No files provided. Send PDF files via form-data or JSON."})

        s3_tenants_path = os.environ.get('S3_TENANTS_PATH')

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
        errors = []

        for f in files:
            try:
                file_name = f['file_name']
                pdf_bytes = f['content']

                if not pdf_bytes:
                    errors.append(f"File '{file_name}' skipped: empty content")
                    continue

                # Extraer texto del PDF
                raw_text_content = ""
                with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                    for page_num, page in enumerate(pdf.pages):
                        try:
                            page_text = page.extract_text()
                            if page_text:
                                raw_text_content += page_text + "\n"
                        except Exception as page_err:
                            print(f"Warning: Could not extract text from page {page_num + 1}: {page_err}")
                            continue

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
                    ContentType='text/markdown; charset=utf-8'
                )

                # Ejecutar Step Function
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
                tb = traceback.format_exc()
                error_msg = f"File '{file_name}': {type(loop_e).__name__}: {loop_e}"
                print(f"File skipped due to error processing: {error_msg}\n{tb}")
                errors.append(f"{error_msg} | Traceback: {tb}")

        if len(executions) == 0:
            return generate_response(400, {"message": "No valid files processed", "errors": errors})

        return generate_response(202, {
            "message": f"Workflow started successfully for {len(executions)} files",
            "executionArns": executions
        })

    except Exception as e:
        print(e)
        return generate_response(500, {"message": str(e)})
