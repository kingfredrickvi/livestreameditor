import os
from os.path import join, dirname
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__)) + "../"
load_dotenv(join(basedir, '.env'))

class Settings(object):
    B2_URL = os.environ.get("B2_URL", "")
    B2_KEY_ID = os.environ.get("B2_KEY_ID", "")
    B2_ACCESS_KEY = os.environ.get("B2_ACCESS_KEY", "")
    SNS_DATABASE_TOPIC_ARN = os.environ.get("SNS_DATABASE_TOPIC_ARN", "arn:aaws:sns:us-east-2:00000000:lse-database")
    TWITCH_CLIENT_ID = os.environ.get("TWITCH_CLIENT_ID", "")
    TWITCH_CLIENT_SECRET = os.environ.get("TWITCH_CLIENT_SECRET", "")
    SERVER_ADDRESS = os.environ.get("SERVER_ADDRESS", "")
    API_BEARER = os.environ.get("API_BEARER", "g54ggsg4FRGr5yhfger5hgrgrgf5rh")

    B2_BUCKET = os.environ.get("B2_BUCKET", "livestreameditor")
    DOWNLOAD_QUEUE_NAME = os.environ.get("DOWNLOAD_QUEUE_NAME", "lse-download.fifo")
    SERVER_ID = os.environ.get("SERVER_ID", "127-0-0-1")
    SERVER_ACTIVE = os.environ.get("SERVER_ACTIVE", "1")
    DATABASE_QUEUE_NAME = os.environ.get("DATABASE_QUEUE_NAME", "lse-database")
    DYNAMODB_VIDEOS = os.environ.get("DYNAMODB_VIDEOS", "lse-videos")
    DYNAMODB_STREAMERS = os.environ.get("DYNAMODB_STREAMERS", "lse-streamers")
    DYNAMODB_STREAMER_GROUPS = os.environ.get("DYNAMODB_STREAMER_GROUPS", "lse-streamer-groups")
    DYNAMODB_SEGMENTS = os.environ.get("DYNAMODB_SEGMENTS", "lse-segments")
    DYNAMODB_ARTIFACTS = os.environ.get("DYNAMODB_ARTIFACTS", "lse-artifacts")
    DYNAMODB_USERS = os.environ.get("DYNAMODB_USERS", "lse-users")
    DEFAULT_PROXY_WIDTH = os.environ.get("DEFAULT_PROXY_WIDTH", "480")
    DEFAULT_CRF = os.environ.get("DEFAULT_CRF", "21")
