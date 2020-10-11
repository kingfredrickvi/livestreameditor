from flask import Flask
from settings import Settings
from flask_cors import CORS

app = Flask(__name__, static_folder='../static')
app.config.from_object(Settings)
CORS(app, supports_credentials=True)
app.secret_key = 'some asdf566rtghyecrasdf asdfet keysdf'
app.debug = True

from app import routes
