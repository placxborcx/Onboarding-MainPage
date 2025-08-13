# lambda_function.py
import os
from serverless_wsgi import handle_request
from main import app

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "https://main.d2fkwp0o2zqc0o.amplifyapp.com")

def lambda_handler(event, context):
    # handle OPTIONS or let serverless_wsgi do it; we prefer early OPTIONS response
    method = (event.get("requestContext") or {}).get("http", {}).get("method", "GET")
    if method == "OPTIONS":
        return {
            "statusCode": 204,
            "headers": {
                "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
            },
            "body": "",
        }
    resp = handle_request(app, event, context)
    headers = resp.get("headers", {}) or {}
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN
    headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    headers["Vary"] = "Origin"
    resp["headers"] = headers
    return resp
