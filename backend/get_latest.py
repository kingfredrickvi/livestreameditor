
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

streamers = requests.get(api_url + "/_streamers", headers={
    'Authorization': 'Bearer ' + os.environ.get("API_BEARER", "")
}).json()["streamers"]

existing_videos = requests.get(api_url + "/_videos", headers={
    'Authorization': 'Bearer ' + os.environ.get("API_BEARER", "")
}).json()["videos"]

token = requests.post("https://id.twitch.tv/oauth2/token", {
    "client_id": CLIENT_ID,
    "client_secret": CLIENT_SECRET,
    "grant_type": "client_credentials"
}).json()["access_token"]

for streamer in streamers:
    if streamer["active"] != "1":
        continue

    username = streamer["platform_username"]
    print("username", username)
    streamer_data = requests.get('{}/users?login={}'.format(TWITCH_BASE_URL, username), headers={
        "Client-Id": CLIENT_ID,
        'Authorization': 'Bearer {}'.format(token)
    }).json()['data']

    user_id = streamer_data[0]['id']

    streamer_videos = requests.get('{}/videos?user_id={}'.format(TWITCH_BASE_URL, user_id), headers={
        "Client-Id": CLIENT_ID,
        'Authorization': 'Bearer {}'.format(token)
    }).json()['data']

    for video in streamer_videos:
        if video.get("type", "") == "archive" and video["thumbnail_url"] != "":
            title = video["title"]
            created_at = video["created_at"]
            video_id = video["id"]

            utc_dt = datetime.strptime(created_at, '%Y-%m-%dT%H:%M:%SZ')
            stamp = (utc_dt - datetime(1970, 1, 1)).total_seconds()

            print(title, stamp)

            add_video = True

            for v in existing_videos:
                if v["vid"] == video_id:
                    print("Video already exists")
                    add_video = False
                    break

            if False:
                print("POSTING VIDEO")
                r = requests.post(api_url + "/add_twitch_video", data=json.dumps({
                    "vid": video_id,
                    "stamp": stamp,
                    "title": title,
                    "width": streamer.get("width", 480),
                    "streamer_uid": streamer["uid"]
                }), headers={
                    'Authorization': 'Bearer ' + os.environ.get("API_BEARER"),
                    'Content-Type': "application/json"
                })
                print("RESP", r.content)
            else:
                print("Skipping")
