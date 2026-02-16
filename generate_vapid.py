from pywebpush import vapid_supported_curves
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
import base64

def generate_vapid_keys():
    # Generate a private key for use with ECDSA
    private_key = ec.generate_private_key(ec.SECP256R1())
    
    # Get the public key
    public_key = private_key.public_key()
    
    # Serialize private key to base64
    private_bytes = private_key.private_numbers().private_value.to_bytes(32, byteorder='big')
    private_base64 = base64.urlsafe_b64encode(private_bytes).decode('utf-8').strip('=')
    
    # Serialize public key to base64 (Uncompressed point format)
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    public_base64 = base64.urlsafe_b64encode(public_bytes).decode('utf-8').strip('=')
    
    print(f"VAPID_PUBLIC_KEY={public_base64}")
    print(f"VAPID_PRIVATE_KEY={private_base64}")

if __name__ == "__main__":
    generate_vapid_keys()
