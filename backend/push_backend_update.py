
import json
import os
from os.path import join, dirname
from dotenv import load_dotenv
import boto3
import uuid as _uuid

basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(join(basedir, '.env'))

def uuid():
    return str(_uuid.uuid4())

SNS_DATABASE_TOPIC_ARN = os.getenv("SNS_DATABASE_TOPIC_ARN", "")
sns = boto3.client('sns')

uid = uuid()

sns.publish(TopicArn=SNS_DATABASE_TOPIC_ARN, Message=json.dumps({"commands": {uid: {"restart": True}}}))
