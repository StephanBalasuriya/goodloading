import os
import base64
import hmac
import hashlib
import json
import time
import secrets
import random

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-stack360-key-replace-this")

def hash_password(password: str) -> str:
    """
    Hashes a password using PBKDF2 HMAC SHA-256 with a random salt.
    """
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt.encode('utf-8'), 
        100000
    ).hex()
    return f"{salt}:{pwd_hash}"

def verify_password(password: str, hashed: str) -> bool:
    """
    Verifies a password against its PBKDF2 hash.
    """
    try:
        salt, pwd_hash = hashed.split(":")
        test_hash = hashlib.pbkdf2_hmac(
            'sha256', 
            password.encode('utf-8'), 
            salt.encode('utf-8'), 
            100000
        ).hex()
        return secrets.compare_digest(pwd_hash, test_hash)
    except Exception:
        return False

def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def base64url_decode(data: str) -> bytes:
    padding = '=' * (4 - len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)

def create_jwt(payload: dict, expires_in_seconds: int = 86400) -> str:
    """
    Creates a signed JWT.
    """
    header = {"alg": "HS256", "typ": "JWT"}
    token_payload = payload.copy()
    token_payload["exp"] = int(time.time()) + expires_in_seconds
    token_payload["iat"] = int(time.time())

    header_b64 = base64url_encode(json.dumps(header).encode('utf-8'))
    payload_b64 = base64url_encode(json.dumps(token_payload).encode('utf-8'))
    
    signature = hmac.new(
        JWT_SECRET.encode('utf-8'), 
        f"{header_b64}.{payload_b64}".encode('utf-8'), 
        hashlib.sha256
    ).digest()
    signature_b64 = base64url_encode(signature)
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_jwt(token: str) -> dict:
    """
    Decodes and validates a signed JWT.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid token format")
        
        header_b64, payload_b64, signature_b64 = parts
        
        # Verify signature
        expected_sig = hmac.new(
            JWT_SECRET.encode('utf-8'), 
            f"{header_b64}.{payload_b64}".encode('utf-8'), 
            hashlib.sha256
        ).digest()
        expected_sig_b64 = base64url_encode(expected_sig)
        
        if not hmac.compare_digest(signature_b64, expected_sig_b64):
            raise ValueError("Invalid signature")
            
        payload_bytes = base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        # Verify expiration
        if "exp" in payload and payload["exp"] < time.time():
            raise ValueError("Token expired")
            
        return payload
    except Exception as e:
        raise ValueError(f"Token validation failed: {e}")

def generate_otp() -> str:
    """
    Generates a secure 6-digit OTP code as a string.
    """
    return f"{random.randint(100000, 999999)}"
