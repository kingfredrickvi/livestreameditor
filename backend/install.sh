
sudo apt-get update
sudo apt-get install -y python3-pip zip awscli wget screen nginx ffmpeg unzip certbot python-certbot-nginx
sudo pip3 install boto3 flask requests flask-socketio awscli python-dotenv flask_cors

sudo useradd -m -d /home/lse -s /bin/bash lse
sudo usermod -aG sudo lse
sudo mkdir /home/lse/.ssh
sudo cp ~/.ssh/authorized_keys /home/lse/.ssh
echo "lse            ALL = (ALL) NOPASSWD: ALL" >> /etc/sudoers

sudo su - lse

git clone https://github.com/kingfredrickvi/livestreameditor.git

cd livestreameditor/backend
cp .env.example .env

echo "API_BEARER = \"$(openssl rand -base64 30)\"" >> .env

chmod +x run.sh
chmod +x screen_run.sh

mkdir -p ~/.aws

echo "aws key id:"
read awsKeyId

echo "aws access key:"
read awsAccessKey

echo "[default]" >> ~/.aws/credentials
echo "aws_access_key_id = $awsKeyId" >> ~/.aws/credentials
echo "aws_secret_access_key = $awsAccessKey" >> ~/.aws/credentials

echo "aws region:"
read awsRegion

echo "[default]" >> ~/.aws/config
echo "region = $awsRegion" >> ~/.aws/config

echo "aws account number:"
read awsAccount

echo "SNS_DATABASE_TOPIC_ARN = \"arn:aws:sns:$awsRegion:$awsAccount:lse-database\"" >> .env

echo "server_id:"
read serverId

echo "SERVER_ID = \"$serverId\"" >> .env

echo "server_address: (no https://)"
read serverAddress

echo "SERVER_ADDRESS = \"https://$serverAddress\"" >> .env

echo "Twitch client ID:"
read twitchClientId

echo "TWITCH_CLIENT_ID = \"$twitchClientId\"" >> .env

echo "Twitch client secret:"
read twitchClientSecret

echo "TWITCH_CLIENT_SECRET = \"$twitchClientSecret\"" >> .env

echo "B2 key ID:"
read b2ClientId

echo "B2_KEY_ID = \"$b2ClientId\"" >> .env

echo "B2 access key:"
read b2AccessKey

echo "B2_ACCESS_KEY = \"$b2AccessKey\"" >> .env

echo "hostname (no periods, eg 'livestreameditor'):"
read serverHostname

sed -i "s/DOMAINA/$serverHostname/g" livestreameditor.nginx.conf
sed -i "s/DOMAINB/$serverAddress/g" sub.livestreameditor.nginx.conf

sudo cp livestreameditor.nginx.conf /etc/nginx/sites-enabled/
sudo cp sub.livestreameditor.nginx.conf /etc/nginx/sites-enabled/

# sudo mkdir -p /dist
# sudo cp -R dist/livestreameditor /dist
# sudo chown -R www-data:www-data /dist

sudo systemctl reload nginx

echo "Frontend zip URL:"
read frontendFileUrl

wget -O build.zip $frontendFileUrl
unzip -o build.zip

sudo rm -rf /dist
sudo mkdir -p /dist
sudo mv dist/livestreameditor/* /dist
rm -rf dist
sudo chown -R www-data:www-data /dist
