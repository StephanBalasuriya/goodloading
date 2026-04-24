import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

GOODLOADING_URL = "https://api.goodloading.com/api/external/calculation"
GOODLOADING_RECOMMEND_URL = (
    "https://api.goodloading.com/api/external/calculation/recommendation"
)
ACCESS_TOKEN = os.getenv("GOODLOADING_ACCESS_TOKEN", "")
print(f"Loaded GOODLOADING_ACCESS_TOKEN: {ACCESS_TOKEN[:4]}...{ACCESS_TOKEN[-4:]}")
HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json",
}

GMPRO_RESPONSE_FILE = Path(__file__).with_name("gmpro_last_response.json")
GMPRO_RESPONSE_TTL_SECONDS = 120
