from pathlib import Path
from app.config import BASE_DIR

v1_path = Path(BASE_DIR, "api", "v1")
template_path = Path(v1_path, "templates")
print(template_path)
static_files_path = Path(v1_path, "static")
print(static_files_path)
password_reset_path = Path(template_path, "email_password_reset.html")
email_verification_path = Path(template_path, "email_verification.html")
