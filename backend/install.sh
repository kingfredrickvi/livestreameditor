
sudo apt-get update
sudo apt-get install -y python3-pip zip awscli wget screen npm nginx ffmpeg
sudo pip3 install boto3 flask requests flask-socketio awscli

sudo useradd -m -d /home/lse -s /bin/bash lse
sudo usermod -aG sudo lse
sudo mkdir /home/lse/.ssh
sudo cp ~/.ssh/authorized_keys /home/lse/.ssh
echo "lse            ALL = (ALL) NOPASSWD: ALL" >> /etc/sudoers

sudo su - lse

git clone https://github.com/kingfredrickvi/livestreameditor.git

chmod +x run.sh

cd livestreameditor/backend
cp .env.example .env

mkdir ~/.aws

echo "aws key id:"
read awsKeyId

echo "aws access key:"
read awsAccessKey

echo "[default]" >> ~/.aws/config
echo "aws_access_key_id $awsKeyId" >> ~/.aws/config
echo "aws_secret_access_key $awsAccessKey" >> ~/.aws/config

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

echo "server_address:"
read serverAddress

echo "SERVER_ADDRESS = \"$serverAddress\"" >> .env

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

sudo cp livestreameditor.nginx.conf /etc/nginx/sites-enabled/

cd ../frontend/

sed -i "s/gaswwprjlctyjd4tgvrc49kq6pj6zy/$twitchClientId" src/environments/environment.prod.ts

sed -i "s/livestreameditor/$serverHostname" src/environments/environment.prod.ts

npm install
npm run-script build -- --prod

mkdir -p /dist
cp -R dist/livestreameditor /dist
sudo chown -R www-data:www-data /dist

sudo systemctl reload nginx
