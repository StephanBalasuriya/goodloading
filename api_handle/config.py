from pathlib import Path

GOODLOADING_URL = "https://api.goodloading.com/api/external/calculation"
GOODLOADING_RECOMMEND_URL = (
    "https://api.goodloading.com/api/external/calculation/recommendation"
)
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg2ZTc5NGQyLWMxNmMtNDY3ZS04YzQyLWU0YTI4NDg5NzMwZCIsImlhdCI6MTc3NDI1NTU5MX0.15_nXCsgBl_XEftfl5v2v2ebHzssyeH6bLbyMdqd7os"  # replace this

HEADERS = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json",
}

GMPRO_RESPONSE_FILE = Path(__file__).with_name("gmpro_last_response.json")
GMPRO_RESPONSE_TTL_SECONDS = 45
