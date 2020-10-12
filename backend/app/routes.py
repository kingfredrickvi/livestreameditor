
from app import app
from settings import Settings
from flask import jsonify, request
import requests
import subprocess
import uuid as _uuid
import os
from flask_socketio import SocketIO, emit
import json
import threading
import boto3
from queue import Queue
from datetime import datetime
import time
import zipfile
import glob
import sys

SNS_DATABASE_TOPIC_ARN = Settings.SNS_DATABASE_TOPIC_ARN
DATABASE_QUEUE_NAME = "{}-{}".format(Settings.DATABASE_QUEUE_NAME, Settings.SERVER_ID)

b2_resource = boto3.resource('s3',
    endpoint_url = Settings.B2_URL,
    aws_access_key_id = Settings.B2_KEY_ID,
    aws_secret_access_key = Settings.B2_ACCESS_KEY
)
b2_client = boto3.client('s3',
    endpoint_url = Settings.B2_URL,
    aws_access_key_id = Settings.B2_KEY_ID,
    aws_secret_access_key = Settings.B2_ACCESS_KEY
)

sns = boto3.client('sns')
sqs = boto3.resource('sqs')
sqs_client = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')

download_queue = sqs.get_queue_by_name(QueueName=Settings.DOWNLOAD_QUEUE_NAME)

DYNAMODB_TABLES = {
    "videos": Settings.DYNAMODB_VIDEOS,
    "streamers": Settings.DYNAMODB_STREAMERS,
    "streamer_groups": Settings.DYNAMODB_STREAMER_GROUPS,
    "segments": Settings.DYNAMODB_SEGMENTS,
    "artifacts": Settings.DYNAMODB_ARTIFACTS,
    "users": Settings.DYNAMODB_USERS
}

DYNAMO_DATA = {
    "videos": {},
    "streamers": {},
    "streamer_groups": {},
    "segments": {},
    "artifacts": {},
    "users": {},
    "servers": {},
    "sorted_videos": []
}

DYNAMO_LOADED = {
    "videos": False,
    "streamers": False,
    "streamer_groups": False,
    "segments": False,
    "artifacts": False,
    "users": False
}

CLIENT_DATA = {}

DOWNLOADS = Queue()
LOCAL_DATA = {}

FILES_TO_DOWNLOAD = [
    "cold_storage.jpg",
    "home1.1.jpg",
    "home1.jpg",
    "home2.jpg",
    "home3.jpg",
    "home4.jpg",
    "home5.jpg",
    "home6.jpg",
    "loading.gif",
    "mypeas.jpg",
    "thumb_failed.jpg",
    "thumb_loading.jpg",
    "thumb_processing.jpg"
]

os.makedirs("./static/", exist_ok=True)
os.makedirs("./static/raw_files", exist_ok=True)
os.makedirs("./static/proxy", exist_ok=True)
os.makedirs("./static/timeline/", exist_ok=True)
os.makedirs("./static/timeline_audio/", exist_ok=True)
os.makedirs("./static/artifacts/", exist_ok=True)
os.makedirs("./static/cold/", exist_ok=True)

class Group:
    Restricted = -1
    Editor = 0
    Moderator = 1
    Admin = 2

socketio = SocketIO(app, cors_allowed_origins="*")

def uuid():
    return str(_uuid.uuid4())

def stamp(dt):
    return dt.replace(tzinfo=datetime.timezone.utc).timestamp()

@app.route('/')
@app.route('/index')
def index():
    return "Hello, Worledd!"

def get_client_data(auth):
    if auth in CLIENT_DATA:
        return CLIENT_DATA[auth]

    if not DYNAMO_LOADED["users"]:
        return {}

    r = requests.get("https://api.twitch.tv/helix/users", headers={
        "Authorization": auth,
        "Client-Id": Settings.TWITCH_CLIENT_ID
    }).json()

    r = r["data"][0]

    user = [user for user in DYNAMO_DATA["users"].values() if user["username"] == str(r["id"])]
    changed = True

    if len(user) == 0:
        user = {
            "username": r["id"],
            "display_name": r["display_name"],
            "email": r["email"],
            "pfp": r["profile_image_url"],
            "added": round(time.time()),
            "group": -1,
            "streamer_groups": "[]",
            "uid": uuid()
        }
    else:
        user = user[0]

        if user["display_name"] != r["display_name"] or user["pfp"] != r["profile_image_url"]:
            user["display_name"] = r["display_name"]
            user["pfp"] = r["profile_image_url"]
        else:
            changed = False

    if changed:
        emit_database_update("users", user)

    r["_group"] = int(user["group"])
    r["_streamer_groups"] = json.loads(user["streamer_groups"])
    r["_uid"] = user["uid"]

    CLIENT_DATA[auth] = r

    return CLIENT_DATA[auth]

@app.route('/api/v1/twitch_login')
def twitch_login():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer" or not DYNAMO_LOADED["users"]:
        return jsonify({
            "success": False
        })

    if auth in CLIENT_DATA:
        return jsonify({
            "user_id": CLIENT_DATA[auth]["id"],
            "username": CLIENT_DATA[auth]["display_name"],
            "group": CLIENT_DATA[auth]["_group"],
            "user_uid": CLIENT_DATA[auth]["_uid"],
            "success": True
        })

    r = requests.get("https://api.twitch.tv/helix/users", headers={
        "Authorization": auth,
        "Client-Id": Settings.TWITCH_CLIENT_ID
    }).json()

    print(r)
    r = r["data"][0]

    user = [user for user in DYNAMO_DATA["users"].values() if user["username"] == str(r["id"])]
    changed = True

    if len(user) == 0:
        user = {
            "username": r["id"],
            "display_name": r["display_name"],
            "email": r["email"],
            "pfp": r["profile_image_url"],
            "added": round(time.time()),
            "group": -1,
            "streamer_groups": "[]",
            "uid": uuid()
        }
    else:
        user = user[0]

        if user["display_name"] != r["display_name"] or user["pfp"] != r["profile_image_url"]:
            user["display_name"] = r["display_name"]
            user["pfp"] = r["profile_image_url"]
        else:
            changed = False

    if changed:
        emit_database_update("users", user)

    r["_group"] = int(user["group"])
    r["_streamer_groups"] = json.loads(user["streamer_groups"])
    r["_uid"] = user["uid"]

    CLIENT_DATA[auth] = r

    return jsonify({
        "user_id": r["id"],
        "username": r["display_name"],
        "group": r["_group"],
        "user_uid": r["_uid"],
        "success": True
    })

@app.route('/api/v1/register', methods=['POST'])
def register():
    return jsonify({
        "success": False
    })

@app.route('/api/v1/admin_le_user/<uid>', methods=['GET'])
def admin_le_user(uid):
    auth = request.headers.get("Authorization", None)

    if auth != "Bearer {}".format(Settings.API_BEARER):
        return jsonify({
            "success": False
        })

    user = DYNAMO_DATA["users"].get(uid, None)

    if user is not None:
        user["group"] = 2
        emit_database_update("users", user)

        return jsonify({
            "success": True
        })
    else:
        return jsonify({
            "success": False
        })

@app.route('/api/v1/add_twitch_video', methods=['POST'])
def add_twitch_video():
    auth = request.headers.get("Authorization", None)

    if not request.get_json():
        return jsonify({
            "error": "Needs to be json"
        })

    data = request.json

    if auth != "Bearer {}".format(Settings.API_BEARER):
        return jsonify({
            "success": False
        })

    vid = data["vid"]
    streamer_uid = data["streamer_uid"]
    title = data["title"]
    platform = data.get("platform", "twitch").strip().lower()
    proxy_width = int(data.get("width", Settings.DEFAULT_PROXY_WIDTH))
    crf = int(data.get("crf", Settings.DEFAULT_CRF))
    stamp = round(data["stamp"])
    uid = uuid()

    emit_database_update("videos", {
        "vid": vid,
        "timestamp": stamp,
        "uid": uid,
        "streamer_uid": streamer_uid,
        "title": title,
        "filesize": 0,
        "duration": -1,
        "progress": 0,
        "hidden": 0,
        "thumbnail_time": 0,
        "generated_artifact": 0,
        "added": round(time.time())
    })
    
    download_queue.send_message(MessageBody=json.dumps({
        "vid": vid,
        "uid": uid,
        "proxy_width": proxy_width,
        "platform": platform,
        "crf": crf,
        "action": "download"
    }), MessageGroupId="download", MessageDeduplicationId=uid+vid)

    return jsonify({
        "success": True
    })

def grab_frame(uid, path, second):
    subprocess.check_output(["ffmpeg", "-y", "-ss", str(second), "-i", "./static/{}/{}.mp4".format(path, uid), "-frames:v", "1", "-q:v", "5", "./static/timeline/{}/0.jpg".format(uid)])
    b2_resource.meta.client.upload_file("./static/timeline/{}/0.jpg".format(uid), Settings.B2_BUCKET, "thumbs/{}.jpg".format(uid))
    cuid = uuid()
    sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({"commands": {cuid: {"thumb": uid}}}))
    return True

@app.route('/logout')
def logout():
    return jsonify({
        "success": True
    })

@app.route('/api/v1/videos')
def videos():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({"success": False})

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Editor: return jsonify({"success": False})

    videos = []
    bookmark = request.args.get('video', None)
    found_bookmark = False
    max_results = 20
    more_results = False

    for video in DYNAMO_DATA["sorted_videos"]:
        if bookmark is not None and not found_bookmark:
            if video["uid"] == bookmark:
                found_bookmark = True
            continue

        s = DYNAMO_DATA["streamers"][video["streamer_uid"]]

        if s["streamer_group"] in client_auth["_streamer_groups"]:
            videos.append({
                "uid": video.get("uid", ""),
                "title": video.get("title", ""),
                "pfp": s.get("pfp", ""),
                "username": s.get("username", ""),
                "progress": video.get("progress", ""),
                "duration": video.get("duration", ""),
                "filesize": video.get("filesize", ""),
                "timestamp": video.get("timestamp", ""),
                "cold_storage": video.get("cold_storage", ""),
                "generated_artifact": video.get("generated_artifact", "")
            })

        if len(videos) >= max_results:
            more_results = True
            break

    return jsonify({
        "videos": videos,
        "more_results": more_results
    })

@app.route('/api/v1/_videos')
def _videos():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        print("Auth none or bearer")
        return jsonify({"success": False})

    if auth != "Bearer {}".format(Settings.API_BEARER):
        return jsonify({
            "success": False
        })

    return jsonify({
        "videos": list(DYNAMO_DATA["videos"].values())
    })

@app.route('/api/v1/_sync')
def _sync():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        print("Auth none or bearer")
        return jsonify({"success": False})

    if auth != "Bearer {}".format(Settings.API_BEARER):
        return jsonify({
            "success": False
        })

    uid = uuid()

    sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({
        "commands": {
            uid: {"rebuild": True}
        }
    }))

    return jsonify({
        "success": True
    })

@app.route('/api/v1/streamers')
def streamers():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        print("Auth none or bearer")
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Editor: return jsonify({"success": False})

    streamers = list(filter(lambda s: client_auth["_group"] > Group.Moderator or s["streamer_group"] in client_auth["_streamer_groups"],
                     (DYNAMO_DATA["streamers"].values())))

    return jsonify({
        "streamers": streamers
    })

@app.route('/api/v1/streamer_groups')
def stream_groups():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        print("Auth none or bearer")
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Moderator: return jsonify({"success": False})

    return jsonify({
        "streamer_groups": list(DYNAMO_DATA["streamer_groups"].values())
    })

@app.route('/api/v1/_streamers')
def _streamers():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    if auth != "Bearer {}".format(Settings.API_BEARER):
        return jsonify({
            "success": False
        })

    return jsonify({
        "streamers": list(DYNAMO_DATA["streamers"].values())
    })

@app.route('/api/v1/users')
def users():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Admin: return jsonify({"success": False})

    return jsonify({
        "users": list(DYNAMO_DATA["users"].values())
    })

@app.route('/api/v1/servers')
def servers():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Editor: return jsonify({"success": False})

    return jsonify({
        "servers": list(DYNAMO_DATA["servers"].values())
    })

@app.route('/api/v1/artifacts')
def artifacts():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Moderator: return jsonify({"success": False})

    artifacts = list(filter(lambda a: client_auth["_group"] > Group.Moderator or \
                    DYNAMO_DATA["streamers"][DYNAMO_DATA["videos"][a["video_uid"]]["streamer_uid"]]["streamer_group"] in client_auth["_streamer_groups"],
                     (DYNAMO_DATA["artifacts"].values())))

    for art in artifacts:
        if art["progress"] == "1":
            art["signed_url"] = b2_client.generate_presigned_url(
                ClientMethod='get_object',
                Params={
                    'Bucket': Settings.B2_BUCKET,
                    'Key': "artifacts/{}.mp4".format(art["uid"])
                }
            )

    return jsonify({
        "artifacts": artifacts
    })

@app.route('/api/v1/user/edit', methods=['POST'])
def edit_user():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Admin: return jsonify({"success": False})

    data = request.json

    user = DYNAMO_DATA["users"].get(data["id"], None)

    if not user:
        return jsonify({
            "success": False
        })

    if "group" in data:
        user["group"] = data["group"]

    if "streamer_groups" in data:
        user["streamer_groups"] = json.dumps(data["streamer_groups"])

    emit_database_update("users", user)

    return jsonify({
        "user": user
    })

@app.route('/api/v1/video/edit', methods=['POST'])
def edit_video():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Moderator: return jsonify({"success": False})

    data = request.json

    video = DYNAMO_DATA["videos"].get(data["id"], None)

    if not video:
        return jsonify({
            "success": False
        })

    if "thumbnail_time" in data:
        video["thumbnail_time"] = data["thumbnail_time"]
        grab_frame(data["id"], "proxy", data["thumbnail_time"])

    emit_database_update("videos", video)

    return jsonify({
        "video": video
    })

@app.route('/api/v1/video/warm/<vid>')
def warm_video(vid):
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Editor: return jsonify({"success": False})

    video = DYNAMO_DATA["videos"].get(vid, None)

    if video is None:
        return jsonify({
            "success": False
        })

    if video["cold_storage"] == 1:
        video["cold_storage"] = 2

        socketio.emit('video', {"video": video}, broadcast=True)

        threading.Thread(target=lambda: do_warm_video(vid)).start()

        return jsonify({
            "success": True
        })
    else:
        return jsonify({
            "success": False
        })

def do_warm_video(vid):
    b2_resource.meta.client.download_file(Settings.B2_BUCKET, "cold/{}.zip".format(vid), "./static/cold/{}.zip".format(vid))

    with zipfile.ZipFile("./static/cold/{}.zip".format(vid), 'r') as zipf:
        zipf.extractall(".")

    os.remove("./static/cold/{}.zip".format(vid))

    video = DYNAMO_DATA["videos"][vid]

    video["cold_storage"] = 0

    socketio.emit('video', {"video": video}, broadcast=True)

@app.route('/api/v1/video/cool/<vid>')
def cool_video(vid):
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Moderator: return jsonify({"success": False})

    video = DYNAMO_DATA["videos"].get(vid, None)

    if video is None:
        return jsonify({
            "success": False
        })

    if video["cold_storage"] == 0:
        video["cold_storage"] = 1

        socketio.emit('video', {"video": video}, broadcast=True)

        threading.Thread(target=lambda: do_cool_video(vid)).start()

        return jsonify({
            "success": True
        })
    else:
        return jsonify({
            "success": False
        })

def do_cool_video(vid):
    try:
        os.remove("./static/proxy/{}.mp4".format(vid))
    except:
        pass

    for filename in glob.glob("./static/timeline/{}/*.jpg".format(vid)):
        if os.path.basename(filename) != "0.jpg":
            try:
                os.remove(filename)
            except:
                pass

    for filename in glob.glob("./static/timeline_audio/{}/*.jpg".format(vid)):
        if os.path.basename(filename) != "0.jpg":
            try:
                os.remove(filename)
            except:
                pass

@app.route('/api/v1/streamer/add', methods=['POST'])
def add_streamer():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Admin: return jsonify({"success": False})

    data = request.json

    streamer = {
        "uid": uuid(),
        "username": data.get("username", ""),
        "direct_link": data.get("direct_link", ""),
        "pfp": data.get("pfp", ""),
        "platform": data.get("platform", ""),
        "platform_username": data.get("platform_username", ""),
        "streamer_group": str(data.get("streamer_group", 0)),
        "width": str(data.get("width", 0)),
        "end_card": data.get("end_card", ""),
        "active": data.get("active", ""),
        "thumbnail": data.get("thumbnail", ""),
        "added": str(time.time())
    }

    emit_database_update("streamers", streamer)

    return jsonify({
        "streamer": streamer
    })

@app.route('/api/v1/streamer/edit', methods=['POST'])
def edit_streamer():
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Admin: return jsonify({"success": False})

    data = request.json

    streamer = DYNAMO_DATA["streamers"].get(data["uid"], None)

    if not streamer:
        return jsonify({
            "success": False
        })

    if "streamer_group" in data:
        streamer["streamer_group"] = data["streamer_group"]

    if "username" in data:
        streamer["username"] = data["username"]

    if "direct_link" in data:
        streamer["direct_link"] = data["direct_link"]

    if "pfp" in data:
        streamer["pfp"] = data["pfp"]

    if "platform" in data:
        streamer["platform"] = data["platform"]

    if "platform_username" in data:
        streamer["platform_username"] = data["platform_username"]

    if "width" in data:
        streamer["width"] = data["width"]

    if "end_card" in data:
        streamer["end_card"] = data["end_card"]

    if "active" in data:
        streamer["active"] = data["active"]

    if "thumbnail" in data:
        streamer["thumbnail"] = data["thumbnail"]

    if "crf" in data:
        streamer["crf"] = data["crf"]

    emit_database_update("streamers", streamer)
    
    return jsonify({
        "streamer": streamer
    })

@app.route('/api/v1/video/<vid>')
def video(vid):
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Editor: return jsonify({"success": False})

    video = DYNAMO_DATA["videos"].get(vid, None)

    if video is None:
        return jsonify({
            "success": False
        })

    s = DYNAMO_DATA["streamers"].get(video["streamer_uid"])

    if s["streamer_group"] not in client_auth["_streamer_groups"]:
        return jsonify({
            "success": False
        })

    video = {
        "uid": video.get("uid", ""),
        "title": video.get("title", ""),
        "pfp": s.get("pfp", ""),
        "username": s.get("username", ""),
        "progress": video.get("progress", ""),
        "filesize": video.get("filesize", ""),
        "duration": video.get("duration", ""),
        "timestamp": video.get("timestamp", ""),
        "cold_storage": video.get("cold_storage", ""),
        "generated_artifact": video.get("generated_artifact", "")
    }

    if video:
        if video["cold_storage"] == 0 and os.path.exists("./static/timeline/{}/1.jpg".format(video["uid"])):
            os.utime("./static/timeline/{}/1.jpg".format(video["uid"]), None)

        return jsonify({
            "video": video
        })
    else:
        return jsonify({
            "success": False
        })

@app.route('/api/v1/segments/<vid>')
def segments(vid):
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Editor: return jsonify({"success": False})

    segments = []

    for segment in DYNAMO_DATA["segments"].values():
        if segment["video_uid"] == vid:
            u = DYNAMO_DATA["users"][segment["user_uid"]]
            segments.append({
                "uid": segment.get("uid", ""),
                "start": float(segment.get("start", "")),
                "end": float(segment.get("end", "")),
                "status": int(segment.get("status", "")),
                "username": u.get("display_name", ""),
                "video_uid": segment.get("video_uid", ""),
                "user_uid": segment.get("user_uid", "")
            })

    return jsonify({
        "segments": segments
    })

@app.route('/api/v1/segment/<vid>', methods=['POST'])
def add_segment(vid):
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Editor: return jsonify({"success": False})

    if vid not in DYNAMO_DATA["videos"]:
        return jsonify({
            "success": False
        })

    data = request.json

    segment = {
        "uid": uuid(),
        "start": float(data.get("start", "")),
        "end": float(data.get("end", "")),
        "status": 0,
        "video_uid": vid,
        "user_uid": client_auth["_uid"],
        "added": round(time.time())
    }

    emit_database_update("segments", segment)

    segment["username"] = client_auth["display_name"]

    d = {
        "segment": segment
    }

    socketio.emit('segment', d, broadcast=True)

    return jsonify(d)

@app.route('/api/v1/segment/edit/<uid>', methods=['POST'])
def edit_segment(uid):
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        print("Auth none or bearer")
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Editor: return jsonify({"success": False})

    data = request.json

    segment = DYNAMO_DATA["segments"].get(uid, None)

    if not segment:
        return jsonify({
            "success": False
        })

    if client_auth["_group"] >= Group.Moderator:
        if "status" in data:
            segment["status"] = data["status"]

    if (segment["status"] == "0" and segment["user_uid"] == client_auth["_uid"]) or client_auth["_group"] >= Group.Moderator:
        if "start" in data:
            segment["start"] = data["start"]

        if "end" in data:
            segment["end"] = data["end"]
    else:
        return jsonify({
            "success": False
        })

    emit_database_update("segments", segment)

    segment["start"] = float(segment.get("start", -1))
    segment["end"] = float(segment.get("end", -1))
    segment["status"] = float(segment.get("status", 0))

    d = {
        "segment": segment
    }

    socketio.emit('segment', d, broadcast=True)

    return jsonify(d)

@app.route('/api/v1/segment/delete/<uid>', methods=['GET'])
def delete_segment(uid):
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Editor: return jsonify({"success": False})

    segment = DYNAMO_DATA["segments"].get(uid, None)

    if not segment:
        return jsonify({
            "success": False
        })

    if (segment["status"] == "0" and segment["user_uid"] == client_auth["_uid"]) or client_auth["_group"] >= Group.Moderator:
        socketio.emit('segment_delete', {
            "segment": {
                "video_uid": segment["video_uid"],
                "uid": segment["uid"]
            }
        }, broadcast=True)
        
        emit_database_delete("segments", segment["uid"])

        return jsonify({
            "success": True
        })
    else:
        return jsonify({
            "success": False
        })

@app.route('/api/v1/video/render/<vid>', methods=['GET'])
def render_video(vid):
    auth = request.headers.get("Authorization", None)

    if auth is None or auth == "Bearer":
        return jsonify({
            "success": False
        })

    client_auth = get_client_data(auth)
    if client_auth["_group"] < Group.Moderator: return jsonify({"success": False})

    uid = uuid()

    video = DYNAMO_DATA["videos"].get(vid)

    if not video:
        return jsonify({
            "success": False
        })

    video["generated_artifact"] = 1

    title = video["title"].replace(">", "|")
    title = title.replace("<", "|")
    title = title + " (Stream Highlights)"

    artifact = {
        "uid": uid,
        "title": title,
        "video_uid": vid,
        "progress": 0,
        "added": round(time.time()),
        "filesize": 0,
        "duration": -1,
        "description": ""
    }

    emit_database_update("artifacts", artifact)
    emit_database_update("videos", video)

    download_queue.send_message(MessageBody=json.dumps({
        "vid": vid,
        "uid": uid,
        "action": "render"
    }), MessageGroupId="download", MessageDeduplicationId=uid+vid+str(artifact["added"]))

    return jsonify({
        "success": True
    })

def allow_sns_to_write_to_sqs(topicarn, queuearn):
    policy_document = """{{
  "Version":"2012-10-17",
  "Statement":[
    {{
      "Sid":"MyPolicy",
      "Effect":"Allow",
      "Principal" : {{"AWS" : "*"}},
      "Action":"SQS:SendMessage",
      "Resource": "{}",
      "Condition":{{
        "ArnEquals":{{
          "aws:SourceArn": "{}"
        }}
      }}
    }}
  ]
}}""".format(queuearn, topicarn)

    return policy_document

def emit_database_update(tablename, value):
    for k,v in value.items():
        value[k] = str(v)

    DYNAMO_DATA[tablename][value["uid"]] = value

    table = dynamodb.Table(DYNAMODB_TABLES[tablename])
    table.put_item(
        Item=value
    )

    sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({
        tablename: {
            value["uid"]: value
        }
    }))

    if tablename == "users":
        for cd in CLIENT_DATA.values():
            if cd["_uid"] == value["uid"]:
                cd["_group"] = int(value["group"])
                cd["_streamer_groups"] = json.loads(value["streamer_groups"])
                cd["_uid"] = value["uid"]


def emit_database_delete(tablename, uid):
    del DYNAMO_DATA[tablename][uid]

    table = dynamodb.Table(DYNAMODB_TABLES[tablename])
    table.delete_item(
        Key={"uid": uid}
    )

    sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({
        tablename: {
            uid: {"deleted": True}
        }
    }))

def download_new_thumb(uid):
    print("Downloading thumb", uid)
    os.makedirs("./static/timeline/{}".format(uid), exist_ok=True)
    b2_resource.meta.client.download_file(Settings.B2_BUCKET, "thumbs/{}.jpg".format(uid), "./static/timeline/{}/0.jpg".format(uid))

def ensure_video_thumb(video, force=False):
    if video["progress"] == "1" and not os.path.isfile("./static/timeline/{}/0.jpg".format(video["uid"])):
        download_new_thumb(video["uid"])

    if video["progress"] == "1" and not os.path.isfile("./static/timeline/{}/1.jpg".format(video["uid"])):
        video["cold_storage"] = 1
    else:
        video["cold_storage"] = 0

def download_assets(force=False):
    for filename in FILES_TO_DOWNLOAD:
        if force or not os.path.exists("./static/{}".format(filename)):
            b2_resource.meta.client.download_file(Settings.B2_BUCKET, "assets/{}".format(filename), "./static/{}".format(filename))

def sort_videos():
    DYNAMO_DATA["sorted_videos"] = list(DYNAMO_DATA["videos"].values())
    DYNAMO_DATA["sorted_videos"] = sorted(DYNAMO_DATA["sorted_videos"], key=lambda v: float(v.get("timestamp", 0)), reverse=True)

def build_database():
    for tk, tv in DYNAMODB_TABLES.items():
        table = dynamodb.Table(tv)
        table_scan = table.scan()

        for item in table_scan["Items"]:
            DYNAMO_DATA[tk][item["uid"]] = item

        while 'LastEvaluatedKey' in table_scan:
            table_scan = table.scan(ExclusiveStartKey=table_scan['LastEvaluatedKey'])

            for item in table_scan["Items"]:
                DYNAMO_DATA[tk][item["uid"]] = item
        
        DYNAMO_LOADED[tk] = True

    sort_videos()

    for video in DYNAMO_DATA["videos"].values():
        ensure_video_thumb(video)

    for user_id, v1 in DYNAMO_DATA["users"].items():
        for cd in CLIENT_DATA.values():
            if cd["_uid"] == user_id:
                cd["_group"] = int(v1["group"])
                cd["_streamer_groups"] = json.loads(v1["streamer_groups"])
                cd["_uid"] = v1["uid"]

    print("Database built")

def run_database_queue():
    try:
        build_database()
    except Exception as e:
        print("Failed to build database", e)

    try:
        database_queue = sqs.get_queue_by_name(QueueName=DATABASE_QUEUE_NAME)
    except Exception as e:
        print("Failed to get queue, trying to create it.", e)
        try:
            resp = sqs.create_queue(QueueName=DATABASE_QUEUE_NAME, Attributes={
                "ReceiveMessageWaitTimeSeconds": "20"
            })
        except Exception as e:
            print("Failed to create queue. Queeing database queue.", e)
            return

    try:
        database_queue = sqs.get_queue_by_name(QueueName=DATABASE_QUEUE_NAME)
    except Exception as e:
        print("Failed to get queue after trying to create. Quitting database queue.", e)
        return

    already_subscribed = False
    next_token = None

    resp = sns.list_subscriptions_by_topic(
        TopicArn=SNS_DATABASE_TOPIC_ARN
    )

    queue_arn = database_queue.attributes["QueueArn"]
    
    while not already_subscribed:
        for sub in resp["Subscriptions"]:
            if sub["Endpoint"] == queue_arn:
                already_subscribed = True
                break

        if not already_subscribed:
            next_token = resp.get("NextToken", None)

            if not next_token:
                break

            resp = sns.list_subscriptions_by_topic(
                TopicArn=SNS_DATABASE_TOPIC_ARN,
                NextToken=next_token
            )

    if not already_subscribed:
        sns.subscribe(TopicArn=SNS_DATABASE_TOPIC_ARN, Protocol="sqs", Endpoint=queue_arn)
        policy_json = allow_sns_to_write_to_sqs(SNS_DATABASE_TOPIC_ARN, queue_arn)
        sqs_client.set_queue_attributes(
            QueueUrl = sqs_client.get_queue_url(QueueName=DATABASE_QUEUE_NAME)["QueueUrl"],
            Attributes = {
                'Policy' : policy_json
            }
        )

    try:
        database_queue.purge()
    except:
        pass

    while True:
        for message in database_queue.receive_messages(WaitTimeSeconds=20):
            data = json.loads(json.loads(message.body)["Message"])
            print("DATA", data)

            for k,v in data.items():
                for k1,v1 in v.items():
                    if k == "commands":
                        if "thumb" in v1:
                            download_new_thumb(v1["thumb"])
                        elif "rebuild" in v1:
                            build_database()
                        elif "shutdown" in v1:
                            os._exit(-1)
                        elif "restart" in v1:
                            print(subprocess.check_output(["git", "pull"]))
                            os._exit(0)
                        elif "update_build" in v1:
                            print(subprocess.check_output(["bash", "update_frontend.sh", v1["update_build"]]))
                        else:
                            print("Unknown command")
                    elif "deleted" in v1:
                        if k1 in DYNAMO_DATA[k]:
                            del DYNAMO_DATA[k][k1]
                    else:
                        DYNAMO_DATA[k][k1] = v1

                        if k == "users":
                            for cd in CLIENT_DATA.values():
                                if cd["_uid"] == k1:
                                    cd["_group"] = int(v1["group"])
                                    cd["_streamer_groups"] = json.loads(v1["streamer_groups"])
                                    cd["_uid"] = v1["uid"]
                        elif k == "videos":
                            ensure_video_thumb(v1)
                            sort_videos()

            message.delete()

        time.sleep(1)

download_assets()

this_server = {
    Settings.SERVER_ID: {"active": Settings.SERVER_ACTIVE, "timestamp": time.time(),
                "address": Settings.SERVER_ADDRESS, "uid": Settings.SERVER_ID}
}

DYNAMO_DATA["servers"] = this_server

sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({
    "servers": this_server
}))

threading.Thread(target=lambda: run_database_queue()).start()
