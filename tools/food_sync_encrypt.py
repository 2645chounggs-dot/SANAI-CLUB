#!/usr/bin/env python3
"""SANAI-CLUB food-sync envelope. Requires cryptography; no AI or server API.

Usage: python tools/food_sync_encrypt.py pairing.json food.json
Writes ONLY the encrypted envelope JSON to stdout. Caller creates a UNIQUE
sync/inbox/YYYY-MM/<event-id>.json via authenticated GitHub connector.
Never put plaintext food.json or private keys in the public repository.
"""
import base64
import json
import secrets
import sys
import uuid
from datetime import date
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def b64(x: bytes) -> str:
    return base64.b64encode(x).decode("ascii")


def envelope(pairing: dict, food: dict) -> dict:
    device = pairing["device_id"]
    if str(uuid.UUID(device)) != device:
        raise ValueError("invalid device_id")
    key = serialization.load_pem_public_key(pairing["public_key_pem"].encode())
    if not isinstance(key, rsa.RSAPublicKey) or key.key_size != 3072:
        raise ValueError("expected an RSA-3072 public key")
    if date.fromisoformat(food["date"]).isoformat() != food["date"]:
        raise ValueError("invalid food date")
    if food["meal"] not in ("아침", "점심", "저녁", "간식"):
        raise ValueError("invalid meal")
    if not isinstance(food["name"], str) or not 0 < len(food["name"]) <= 120:
        raise ValueError("invalid food name")
    if not isinstance(food["unit"], str) or not 0 < len(food["unit"]) <= 24:
        raise ValueError("invalid unit")
    for field in ("base", "amount"):
        n = food[field]
        if isinstance(n, bool) or not isinstance(n, (int, float)) or not 0 < n <= 100000:
            raise ValueError(f"invalid {field}")
    for field in ("kcal", "p", "c", "f"):
        n = food[field]
        cap = 20000 if field == "kcal" else 5000
        if isinstance(n, bool) or not isinstance(n, (int, float)) or not 0 <= n <= cap:
            raise ValueError(f"invalid {field}")
    event_id = str(uuid.uuid4())
    payload = {
        "v": 1,
        "id": event_id,
        "date": food["date"],
        "meal": food["meal"],
        "name": food["name"],
        "unit": food["unit"],
        "base": food["base"],
        "amount": food["amount"],
        "kcal": food["kcal"],
        "p": food["p"],
        "c": food["c"],
        "f": food["f"],
        "estimate": food.get("estimate", True) is True,
    }
    # Android's OAEP implementation uses SHA-256 as digest and SHA-1 for MGF1.
    aes_key = secrets.token_bytes(32)
    nonce = secrets.token_bytes(12)
    wrapped = key.encrypt(aes_key, padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA1()),
        algorithm=hashes.SHA256(),
        label=None))
    ciphertext = AESGCM(aes_key).encrypt(
        nonce, json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode(), None)
    return {
        "v": 1,
        "device": device,
        "id": event_id,
        "wrapped_key": b64(wrapped),
        "nonce": b64(nonce),
        "ciphertext": b64(ciphertext),
    }


def self_test() -> None:
    private = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    pair = {
        "device_id": str(uuid.uuid4()),
        "public_key_pem": private.public_key().public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode(),
    }
    food = dict(date="2026-11-21", meal="점심", name="테스트 제육볶음 1인분",
                unit="인분", base=1, amount=1, kcal=650, p=35, c=65, f=27, estimate=True)
    env = envelope(pair, food)
    key = private.decrypt(base64.b64decode(env["wrapped_key"]), padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA1()),
        algorithm=hashes.SHA256(), label=None))
    clear = json.loads(AESGCM(key).decrypt(
        base64.b64decode(env["nonce"]), base64.b64decode(env["ciphertext"]), None))
    assert clear["name"] == food["name"] and clear["id"] == env["id"]
    tampered = bytearray(base64.b64decode(env["ciphertext"]))
    tampered[0] ^= 1
    try:
        AESGCM(key).decrypt(base64.b64decode(env["nonce"]), tampered, None)
        raise AssertionError("tamper check failed")
    except cryptography.exceptions.InvalidTag:
        pass
    print("PASS RSA-OAEP-SHA256/MGF1-SHA1 + AES-256-GCM roundtrip and tamper check", file=sys.stderr)


if __name__ == "__main__":
    import cryptography.exceptions
    if len(sys.argv) == 2 and sys.argv[1] == "--self-test":
        self_test()
    elif len(sys.argv) == 3:
        with open(sys.argv[1], encoding="utf-8") as f:
            pairing = json.load(f)
        with open(sys.argv[2], encoding="utf-8") as f:
            food = json.load(f)
        print(json.dumps(envelope(pairing, food), ensure_ascii=False, separators=(",", ":")))
    else:
        raise SystemExit("Usage: food_sync_encrypt.py --self-test | pairing.json food.json")
