
import requests
from datetime import datetime
import json
import os
from os.path import join, dirname
from dotenv import load_dotenv
import subprocess
import zipfile
import boto3
import uuid as _uuid

def uuid():
    return str(_uuid.uuid4())

def zipdir(path, ziph):
    # ziph is zipfile handle
    stat = 0

    for root, dirs, files in os.walk(path):
        for f in files:
            ziph.write(os.path.join(root, f))

    return stat

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(join(basedir, '.env'))

os.chdir("../frontend")

subprocess.check_output(["ng", "build", "--prod"], shell=True)

build_uid = uuid()

zipf = zipfile.ZipFile("dist/{}.zip".format(build_uid), 'w', zipfile.ZIP_DEFLATED)
zipdir("./dist/livestreameditor", zipf)
zipf.close()

B2_URL = os.getenv("B2_URL", "")
B2_KEY_ID = os.getenv("B2_KEY_ID", "")
B2_ACCESS_KEY = os.getenv("B2_ACCESS_KEY", "")
B2_BUCKET = os.getenv("B2_BUILDS_BUCKET", "livestreameditor")
SNS_DATABASE_TOPIC_ARN = os.getenv("SNS_DATABASE_TOPIC_ARN", "")
sns = boto3.client('sns')

b2_client = boto3.resource('s3',
    endpoint_url = B2_URL,
    aws_access_key_id = B2_KEY_ID,
    aws_secret_access_key = B2_ACCESS_KEY
)

b2_client.meta.client.upload_file("dist/{}.zip".format(build_uid), B2_BUCKET, "builds/{}.zip".format(build_uid))
sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({"commands": {build_uid: {"update_build": "https://livestreameditorbuilds234.s3.us-west-002.backblazeb2.com/builds/{}.zip".format(build_uid)}}}))

print("new build id", build_uid)
