
import requests
from datetime import datetime
import json
import os
from os.path import join, dirname
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(join(basedir, '.env'))

CLIENT_ID = os.environ.get("TWITCH_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("TWITCH_CLIENT_SECRET", "")
TWITCH_BASE_URL = "https://api.twitch.tv/helix"

api_url = os.environ.get("SERVER_ADDRESS", "") + "/api/v1"

streamers = requests.get(api_url + "/_sync", headers={
    'Authorization': 'Bearer ' + os.environ.get("API_BEARER", "")
}).json()
