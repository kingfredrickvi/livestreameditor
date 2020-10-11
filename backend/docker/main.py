import requests
import subprocess
import uuid as _uuid
import os
from PIL import Image
import math
import numpy as np
import json
import moviepy.editor
import boto3
from queue import Queue
from datetime import datetime
import time
from multiprocessing import Pool
import shutil
from threading import Thread
import zipfile
import glob
import traceback

SNS_DATABASE_TOPIC_ARN = os.getenv("SNS_DATABASE_TOPIC_ARN", "")
DOWNLOAD_QUEUE_NAME = os.getenv("DOWNLOAD_QUEUE_NAME", "lse-download.fifo")
do_processing_as_well = True if int(os.getenv("DO_PROCESSING_AS_WELL", "1")) else False
RENDER_SERVER_NAME = os.getenv("RENDER_SERVER_NAME", "Unknown Render Server")
MAX_PROCESS = int(os.getenv("MAX_PROCESS", 1))
MAX_THREADS = int(os.getenv("MAX_THREADS", 8))
B2_URL = os.getenv("B2_URL", "")
B2_KEY_ID = os.getenv("B2_KEY_ID", "")
B2_ACCESS_KEY = os.getenv("B2_ACCESS_KEY", "")
B2_BUCKET = os.getenv("B2_BUCKET", "livestreameditor")

sns = boto3.client('sns')
sqs = boto3.resource('sqs')
dynamodb = boto3.resource('dynamodb')

download_queue = sqs.get_queue_by_name(QueueName=DOWNLOAD_QUEUE_NAME)

DYNAMODB_TABLES = {
    "videos": "lse-videos",
    "streamers": "lse-streamers",
    "streamer_groups": "lse-streamer-groups",
    "segments": "lse-segments",
    "artifacts": "lse-artifacts",
    "users": "lse-users"
}

DOWNLOADING = Queue()
PROCESSING = Queue()

b2_client = boto3.resource('s3',
    endpoint_url = B2_URL,
    aws_access_key_id = B2_KEY_ID,
    aws_secret_access_key = B2_ACCESS_KEY
)

FILES_TO_DOWNLOAD = ["general_endcard.jpg"]

os.makedirs("./static/", exist_ok=True)
os.makedirs("./static/raw_files", exist_ok=True)
os.makedirs("./static/proxy", exist_ok=True)
os.makedirs("./static/timeline/", exist_ok=True)
os.makedirs("./static/timeline_audio/", exist_ok=True)
os.makedirs("./static/artifacts/", exist_ok=True)

def download_database(tablename):
    table = dynamodb.Table(tablename)
    table_scan = table.scan()

    results = {}

    for item in table_scan["Items"]:
        results[item["uid"]] = item

    while 'LastEvaluatedKey' in table_scan:
        table_scan = table.scan(ExclusiveStartKey=table_scan['LastEvaluatedKey'])

        for item in table_scan["Items"]:
            results[item["uid"]] = item

    return results

def uuid():
    return str(_uuid.uuid4())

def download_assets(force=False):
    for filename in FILES_TO_DOWNLOAD:
        if force or not os.path.exists("./static/{}".format(filename)):
            b2_client.meta.client.download_file(B2_BUCKET, "assets/{}".format(filename), "./static/{}".format(filename))

def do_render(vid, uid):
    try:
        video_table = dynamodb.Table(DYNAMODB_TABLES["videos"])
        video = video_table.get_item(Key={'uid': vid})['Item']

        streamer_table = dynamodb.Table(DYNAMODB_TABLES["streamers"])
        streamer = streamer_table.get_item(Key={'uid': video["streamer_uid"]})['Item']

        artifact_table = dynamodb.Table(DYNAMODB_TABLES["artifacts"])
        artifact = artifact_table.get_item(Key={'uid': uid})['Item']

        all_segments = download_database(DYNAMODB_TABLES["segments"]).values()
        users = download_database(DYNAMODB_TABLES["users"])

        if not video:
            print("VIDEO ID not found")
            artifact["progress"] = str(-1)
            artifact_table.put_item(Item=artifact)
            updated_artifacts = {}
            updated_artifacts[uid] = artifact
            sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({"artifacts": updated_artifacts}))

            return False

        segments = []

        for segment in all_segments:
            if segment["video_uid"] == vid and int(segment["status"]) == 2:
                segments.append(segment)

        if not segments:
            artifact["progress"] = str(-1)
            artifact_table.put_item(Item=artifact)
            updated_artifacts = {}
            updated_artifacts[uid] = artifact
            sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({"artifacts": updated_artifacts}))

            return False

        print(b2_client.meta.client.download_file(B2_BUCKET, "raws/{}.mp4".format(vid), "./static/raw_files/{}.mp4".format(vid)))

        if int(video["thumbnail_time"]) > 0:
            ffmpeg_output = grab_frame(vid, "raw_files", video["thumbnail_time"])
            print("S3", b2_client.meta.client.upload_file("./static/timeline/{}/0.jpg".format(vid), B2_BUCKET, "thumbs/{}.jpg".format(vid)))
            cuid = uuid()
            sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({"commands": {cuid: {"thumb": vid}}}))
            os.remove("./static/timeline/{}/0.jpg".format(vid))
            os.rmdir("./static/timeline/{}".format(vid))

        raw_file = moviepy.editor.VideoFileClip("./static/raw_files/{}.mp4".format(vid))
        clips = []
        contributers = set()

        for segment in segments:
            clips.append(raw_file.subclip(float(segment["start"]), float(segment["end"])))
            contributers.add(users[segment["user_uid"]]["display_name"])

        clips[-1] = clips[-1].fadeout(2)
        clips[0] = clips[0].fadein(2)
        image_uuid = uuid()

        if streamer["end_card"]:
            r = requests.get(streamer["end_card"], stream=True)
            if r.status_code == 200:
                with open("{}.jpg".format(image_uuid), 'wb') as f:
                    r.raw.decode_content = True
                    shutil.copyfileobj(r.raw, f)
                    imclip = moviepy.editor.ImageClip("{}.jpg".format(image_uuid)).resize(newsize=(clips[0].w, clips[0].h)).set_duration(11).fadein(3).fadeout(2)
                    clips.append(imclip)
            else:
                image_uuid = None
        else:
            imclip = moviepy.editor.ImageClip("./static/general_endcard.jpg").resize(newsize=(clips[0].w, clips[0].h)).set_duration(11).fadein(3).fadeout(2)
            clips.append(imclip)
            image_uuid = None

        output_video = moviepy.editor.concatenate_videoclips(clips)
        output_video.write_videofile("./static/artifacts/{}.mp4".format(uid))

        for clip in clips:
            clip.close()

        raw_file.close()
        output_video.close()

        del raw_file
        del clips
        del output_video

        if image_uuid is not None:
            os.remove("{}.jpg".format(image_uuid))
        
        print("S3", b2_client.meta.client.upload_file("./static/artifacts/{}.mp4".format(uid), B2_BUCKET, "artifacts/{}.mp4".format(uid)))

        raw_filesize = os.stat("./static/artifacts/{}.mp4".format(uid)).st_size

        duration = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                "format=duration", "-of",
                                "default=noprint_wrappers=1:nokey=1", "./static/artifacts/{}.mp4".format(uid)],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT).stdout)

        dt = datetime.fromtimestamp(float(video["timestamp"]))

        artifact["progress"] = "1"
        artifact["filesize"] = str(raw_filesize)
        artifact["duration"] = str(duration)
        artifact["description"] = """Streamer: {}
Link: {}
Streamed: {}

Contributers: {}

If you would like to help out with editing stream highlights, check out https://livestreameditor.com    
""".format(streamer["username"], streamer["direct_link"], dt.isoformat(), ", ".join(str(c) for c in contributers))

        print("Done with video")
    except Exception as e:
        print("FAILED TO EXPORT", e)
        artifact["progress"] = str(-1)
        print(traceback.print_exc())

    artifact_table.put_item(Item=artifact)
    updated_artifacts = {}
    updated_artifacts[uid] = artifact

    sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({"artifacts": updated_artifacts}))

    os.remove("./static/artifacts/{}.mp4".format(uid))
    os.remove("./static/raw_files/{}.mp4".format(vid))

def grab_frame(uid, path, second):
    os.makedirs("./static/timeline/{}".format(uid), exist_ok=True)
    return subprocess.check_output(["ffmpeg", "-y", "-ss", str(second), "-i", "./static/{}/{}.mp4".format(path, uid), "-frames:v", "1", "-q:v", "5", "./static/timeline/{}/0.jpg".format(uid)])

def generate_sound_chunk(pool_arg):
    uid, j, frames_per_sound, duration, sound_chunk = pool_arg
    chunk_length = min((j+sound_chunk), math.ceil(duration)) - j

    ffmpeg_output = subprocess.check_output(["ffmpeg", "-y", "-ss", str(j), "-i", "./static/proxy/{}.mp4".format(uid), "-threads", str(MAX_THREADS), "-t", str(chunk_length), "-vn", "./static/raw_files/{}-{}.aac".format(uid, j)])
    ffmpeg_output = subprocess.check_output(["ffmpeg", "-y", "-i", "./static/raw_files/{}-{}.aac".format(uid, j), "-filter_complex", "compand=gain=0,showwavespic=s={}x75".format(math.ceil((chunk_length)*frames_per_sound)), "-frames:v", "1", "./static/raw_files/{}-{}.png".format(uid, j)])

    audio = np.asarray(Image.open("./static/raw_files/{}-{}.png".format(uid, j))).copy()
    audio[audio > 0] = 255

    for i in range(0, math.floor(chunk_length*frames_per_sound), frames_per_sound):
        im = Image.fromarray(np.uint8(audio[:, i:min(audio.shape[1], i+frames_per_sound)]))
        im = im.convert("RGB")
        im.save("./static/timeline_audio/{}/{}.jpg".format(uid, ((j*frames_per_sound)+i)//frames_per_sound), quality=70)

    os.remove("./static/raw_files/{}-{}.aac".format(uid, j))
    os.remove("./static/raw_files/{}-{}.png".format(uid, j))

    return True

def zipdir(path, ziph, recompress=False):
    # ziph is zipfile handle
    stat = 0

    for root, dirs, files in os.walk(path):
        for f in files:
            if recompress:
                im = Image.open(os.path.join(root, f))
                im.save(os.path.join(root, f), quality=30)
            ziph.write(os.path.join(root, f))
            stat += os.stat(os.path.join(root, f)).st_size
            os.remove(os.path.join(root, f))

    return stat

def check_processing():
    while True:
        if PROCESSING.empty():
            time.sleep(5)
            continue

        action, vid, uid, proxy_width, crf = PROCESSING.get()

        if action == "download":
            do_video_processing(vid, uid, proxy_width, crf)
        elif action == "render":
            do_render(vid, uid)

def do_video_processing(vid, uid, proxy_width, crf):
        print("Rendering Video", vid, uid)

        video = {}
        video["render_server_name"] = RENDER_SERVER_NAME

        try:
            os.makedirs("./static/timeline/{}".format(uid), exist_ok=True)
            os.makedirs("./static/timeline_audio/{}".format(uid), exist_ok=True)

            youtube_dl_output = subprocess.check_output(['youtube-dl', '-f', 'best', '-o', './static/raw_files/{}-raw.mp4'.format(uid), 'https://www.twitch.tv/videos/{}'.format(vid)])
            
            print(youtube_dl_output)
            
            ffmpeg_output = subprocess.check_output(["ffmpeg", "-i", "./static/raw_files/{}-raw.mp4".format(uid), "-threads", str(MAX_THREADS), "-vcodec", "libx264", "-crf", str(crf), "-preset", "faster", "-profile:v", "main", "./static/raw_files/{}.mp4".format(uid)])
            os.remove("./static/raw_files/{}-raw.mp4".format(uid))
            
            ffmpeg_output = subprocess.check_output(["ffmpeg", "-i", "./static/raw_files/{}.mp4".format(uid), "-threads", str(MAX_THREADS), "-vcodec", "libx264", "-crf", "24", "-preset", "veryfast", "-vf", "scale={}:-1".format(proxy_width), "-movflags", "+faststart", "./static/proxy/{}.mp4".format(uid)])
            ffmpeg_output = subprocess.check_output(["ffmpeg", "-i", "./static/proxy/{}.mp4".format(uid), "-r", "1", "-vf", "scale=240:-1", "./static/timeline/{}/%01d.jpg".format(uid)])
            ffmpeg_output = grab_frame(uid, "raw_files", 0)

            duration = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                    "format=duration", "-of",
                                    "default=noprint_wrappers=1:nokey=1", "./static/proxy/{}.mp4".format(uid)],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT).stdout)-1
            print(duration)

            frames_per_sound = 60
            sound_chunk = 60*5

            pool_args = [(uid, j, frames_per_sound, duration, sound_chunk) for j in range(0, math.floor(duration), sound_chunk)]

            with Pool(20) as p:
                print(p.map(generate_sound_chunk, pool_args))

            raw_filesize = os.stat("./static/raw_files/{}.mp4".format(uid)).st_size

            print("Uploading file")

            print("S3", b2_client.meta.client.upload_file("./static/raw_files/{}.mp4".format(uid), B2_BUCKET, "raws/{}.mp4".format(uid)))
            os.remove("./static/raw_files/{}.mp4".format(uid))

            print("S3", b2_client.meta.client.upload_file("./static/timeline/{}/0.jpg".format(uid), B2_BUCKET, "thumbs/{}.jpg".format(uid)))

            hot_filesize = os.stat("./static/proxy/{}.mp4".format(uid)).st_size

            # Now zip up those bad boys and ah upload them.
            zipf = zipfile.ZipFile("{}.zip".format(uid), 'w', zipfile.ZIP_DEFLATED)
            zipf.write("./static/proxy/{}.mp4".format(uid))
            hot_filesize += zipdir("./static/timeline/{}".format(uid), zipf, True)
            hot_filesize += zipdir("./static/timeline_audio/{}".format(uid), zipf)
            zipf.close()

            cold_filesize = os.stat("{}.zip".format(uid)).st_size

            print("S3", b2_client.meta.client.upload_file("{}.zip".format(uid), B2_BUCKET, "cold/{}.zip".format(uid)))

            os.remove("{}.zip".format(uid))
            os.rmdir("./static/timeline/{}".format(uid))
            os.rmdir("./static/timeline_audio/{}".format(uid))

            print("Removed")

            video["progress"] = str(1)
            video["duration"] = str(duration)
            video["raw_filesize"] = str(raw_filesize)
            video["cold_filesize"] = str(cold_filesize)
            video["hot_filesize"] = str(hot_filesize)
            video["filesize"] = str(raw_filesize+cold_filesize)
            video["thumbnail_time"] = str(-1)

            print("Done processing!")
        except Exception as e:
            print("FAILED downloading", e)
            video["progress"] = str(-1)

        try:
            video_table = dynamodb.Table(DYNAMODB_TABLES["videos"])

            updated_video = video_table.get_item(Key={'uid': uid})['Item']

            for k,v in video.items():
                updated_video[k] = v

            video_table.put_item(Item=updated_video)
            updated_videos = {}
            updated_videos[uid] = updated_video

            sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({"videos": updated_videos}))
        except Exception as e:
            print("Failed to get table", e)

def download_twitch_vod(vid, uid):
    try:
        print("Downloading", vid, uid)
        youtube_dl_output = subprocess.check_output(['youtube-dl', '-f', 'best', '-o', './static/raw_files/{}-raw.mp4'.format(uid), 'https://www.twitch.tv/videos/{}'.format(vid)])
        print(youtube_dl_output)
        return True
    except Exception as e:
        print("Failed to download", e)
        video_table = dynamodb.Table(DYNAMODB_TABLES["videos"])

        updated_video = video_table.get_item(Key={'uid': uid})['Item']

        updated_video["progress"] = str(-1)

        video_table.put_item(Item=updated_video)
        updated_videos = {}
        updated_videos[uid] = updated_video

        sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({"videos": updated_videos}))
        return False

def wait_for_download_message():
    while True:
        print("Looking for new messages...")
        if PROCESSING.qsize() <= MAX_PROCESS:
            for message in download_queue.receive_messages(WaitTimeSeconds=20):
                print("Processing", message)
                print(message.body)
                data = json.loads(message.body)
                message.delete()

                action = data.get("action", None)

                if action == "render":
                    PROCESSING.put((
                        action, data["vid"], data["uid"], None, None
                    ))
                elif action == "download":
                    try:
                        if download_twitch_vod(data["vid"], data["uid"]):
                            PROCESSING.put((
                                action, data["vid"], data["uid"], data["proxy_width"], data["crf"]
                            ))
                    except:
                        pass

        time.sleep(1)

if __name__ == '__main__':
    download_assets(True)
    Thread(target=check_processing).start()
    wait_for_download_message()
