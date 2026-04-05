import json
import os
import boto3
import urllib.error
import datetime
import base64
import decimal
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
results_table = dynamodb.Table(os.environ['RESULTS_TABLE_NAME'])
bucket_name = os.environ['S3_BUCKET_NAME']
groq_api_key = os.environ.get('GROQ_API_KEY')
sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')

def get_s3_content(file_path):
    if file_path.startswith('s3://'):
        path_without_scheme = file_path[5:]
        b_name, key = path_without_scheme.split('/', 1)
    elif '/' in file_path:
        parts = file_path.split('/', 1)
        b_name = parts[0]
        key = parts[1]
    else:
        b_name = bucket_name
        key = file_path
    
    response = s3.get_object(Bucket=b_name, Key=key)
    return response['Body'].read().decode('utf-8')

def build_prompt(instructions_markdown: str, content_markdown: str) -> str:
    return (
        "Evalua el contenido segun las instrucciones dadas."
        " La respuesta final debe ser JSON valido.\n\n"
        "## Instrucciones\n"
        f"{instructions_markdown.strip()}\n\n"
        "## Contenido a evaluar\n"
        f"{content_markdown.strip()}\n"
    )

def evaluate_file(event, context):
    body = None
    try:
        file_path = event.get('file_path')
        instructions_path = event.get('instructions_path')

        instructions = get_s3_content(instructions_path)
        content = get_s3_content(file_path)

        prompt = build_prompt(instructions, content)

        url = "https://api.groq.com/openai/v1/chat/completions"
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }

        body = json.dumps(payload).encode('utf-8')

        request = Request(
            url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {groq_api_key}",
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/121.0.0.0 Safari/537.36"
                )
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=60) as response:
                response_json = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            error_body = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Groq devolvio HTTP {error.code}: {error_body}") from error
        except URLError as error:
            raise RuntimeError(f"No se pudo conectar con Groq: {error.reason}") from error

        event['groq_response'] = response_json['choices'][0]['message']['content']
        return event

    except Exception as e:
        print(f"Error in evaluate_file: {e}")
        raise e

def save_result(event, context):
    try:
        user_id = event['user_id']
        groq_response = event['groq_response']
        
        now = datetime.datetime.utcnow().isoformat() + 'Z'
        
        try:
            groq_data = json.loads(groq_response, parse_float=decimal.Decimal)
        except Exception:
            groq_data = {"raw_response": groq_response}
            
        # Crear item inicial desde la data de Groq
        item_to_save = {}
        item_to_save.update(groq_data)
        
        # Agregar llaves maestras requeridas
        item_to_save['userId'] = user_id
        item_to_save['createdAt'] = now
        
        results_table.put_item(Item=item_to_save)
        
        event['createdAt'] = now
        return event

    except Exception as e:
        print(f"Error in save_result: {e}")
        raise e

def generate_report(event, context):
    try:
        groq_response_str = event['groq_response']
        createdAt = event['createdAt']

        try:
            groq_data = json.loads(groq_response_str)
        except:
            groq_data = {"raw": groq_response_str}

        tenant_name = "Desconocido"
        for k in ["Nombre", "nombre", "Inquilino", "inquilino", "Tenant", "tenant", "tenant_name", "Nombre completo"]:
            if k in groq_data:
                tenant_name = str(groq_data[k])
                break
        
        event['tenant_name'] = tenant_name

        csv_content = "Clave;Valor\n"
        csv_content += f"Fecha de Analisis;{createdAt}\n"
        for key, value in groq_data.items():
            csv_content += f"{key};{value}\n"

        # Save to S3
        csv_key = f"resultados-workflow/{tenant_name}_{createdAt.replace(':', '-')}.csv"
        s3.put_object(
            Bucket=bucket_name,
            Key=csv_key,
            Body=csv_content.encode('utf-8'),
            ContentType='text/csv'
        )
        
        event['report_s3_key'] = csv_key
        event['csv_content'] = csv_content
        return event

    except Exception as e:
        print(f"Error in generate_report: {e}")
        raise e

def send_email(event, context):
    try:
        user_email = event.get('user_email') or event.get('userId') # Fallback por si la vieja maquina se ejecuta
        tenant_name = event.get('tenant_name', 'Inquilino')
        val_csv = event['csv_content']

        # Convert simple CSV to HTML table for standard marketing approach
        rows = val_csv.strip().split('\n')
        html_table = "<table style='width: 100%; border-collapse: collapse; font-family: Arial, Helvetica, sans-serif; margin-top: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);'>"
        for i, row in enumerate(rows):
            cols = row.split(';')
            bg_color = "#f8f9fa" if i % 2 == 0 else "#ffffff"
            text_weight = "bold" if i == 0 else "normal"
            html_table += f"<tr style='background-color: {bg_color}; border-bottom: 1px solid #e0e0e0;'>"
            for col in cols:
                html_table += f"<td style='padding: 15px; text-align: left; font-weight: {text_weight}; color: #333;'>{col}</td>"
            html_table += "</tr>"
        html_table += "</table>"

        year = datetime.datetime.now().year
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 40px 0;">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                            <tr>
                                <td style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 40px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;">Análisis de IA Completado</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 40px;">
                                    <p style="font-size: 16px; color: #555555; line-height: 1.6; margin-top: 0;">Hola,</p>
                                    <p style="font-size: 16px; color: #555555; line-height: 1.6;">El flujo de trabajo por Inteligencia Artificial ha procesado la información para el inquilino <strong style="color: #1e3c72;">{tenant_name}</strong>. A continuación, puedes ver un resumen comparativo de los resultados:</p>
                                    
                                    <div style="margin: 30px 0; overflow-x: auto;">
                                        {html_table}
                                    </div>
                                    
                                    <p style="font-size: 16px; color: #555555; line-height: 1.6;">Hemos adjuntado el reporte detallado en formato CSV a este correo para tus registros locales.</p>
                                    
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px;">
                                        <tr>
                                            <td align="center">
                                                <a href="#" style="background-color: #1e3c72; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px; display: inline-block;">Acceder al Sistema</a>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                                    <p style="font-size: 13px; color: #999999; margin: 0;">&copy; {year} Workflow IA. Todos los derechos reservados.</p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        url = "https://api.sendgrid.com/v3/mail/send"
        headers = {
            "Authorization": f"Bearer {sendgrid_api_key}",
            "Content-Type": "application/json"
        }

        data = {
            "personalizations": [{"to": [{"email": user_email}]}],
            "from": {"email": os.environ.get('SENDGRID_FROM_EMAIL', 'test@example.com'), "name": "Workflow IA"},
            "subject": f"Resultado evaluación de inquilino - {tenant_name}",
            "content": [{"type": "text/html", "value": html_body}],
            "attachments": [
                {
                    "content": base64.b64encode(val_csv.encode('utf-8')).decode('utf-8'),
                    "type": "text/csv",
                    "filename": "reporte.csv",
                    "disposition": "attachment"
                }
            ]
        }

        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            res_body = response.read()
            print("Email sent", res_body)

        return {"message": "Workflow completed and email sent"}

    except Exception as e:
        print(f"Error in send_email: {e}")
        raise e
