import json
import os
import datetime
import bcrypt
import jwt
import boto3
import uuid

dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table(os.environ['USERS_TABLE_NAME'])
jwt_secret = os.environ.get('JWT_SECRET', 'secret123')

def generate_response(status_code, body):
    return {
        "statusCode": status_code,
        "body": json.dumps(body),
        "headers": {
            "Content-Type": "application/json"
        }
    }

def register(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        name = body.get('name')
        email = body.get('email')
        password = body.get('password')

        if not name or not email or not password:
            return generate_response(400, {"message": "name, email, and password are required"})

        # Check if user exists
        response = users_table.get_item(Key={'email': email})
        if 'Item' in response:
            return generate_response(400, {"message": "User already exists"})

        # encrypt password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Generar UUID para el usuario
        user_id = str(uuid.uuid4())
        
        # Save to DB
        now = datetime.datetime.utcnow().isoformat() + 'Z'
        users_table.put_item(
            Item={
                'email': email,
                'id': user_id,
                'name': name,
                'password': hashed_password,
                'createdAt': now,
                'updatedAt': now
            }
        )

        return generate_response(201, {"message": "User registered successfully"})

    except Exception as e:
        print(e)
        return generate_response(500, {"message": "Internal server error"})

def login(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email')
        password = body.get('password')

        if not email or not password:
            return generate_response(400, {"message": "email and password are required"})

        response = users_table.get_item(Key={'email': email})
        user = response.get('Item')

        if not user:
            return generate_response(401, {"message": "Invalid credentials"})

        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            return generate_response(401, {"message": "Invalid credentials"})

        # Generate JWT
        token = jwt.encode({
            'email': email,
            'name': user.get('name'),
            'id': user.get('id'),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, jwt_secret, algorithm='HS256')

        return generate_response(200, {"token": token})

    except Exception as e:
        print(e)
        return generate_response(500, {"message": "Internal server error"})
