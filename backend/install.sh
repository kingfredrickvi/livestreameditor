
sudo apt-get update
sudo apt-get install -y python3-pip zip awscli wget
sudo pip3 install boto3 flask requests flask-socketio awscli

mkdir ~/.aws

echo "aws key id"
read awsKeyId

echo "aws access key"
read awsAccessKey

echo "[default]" >> ~/.aws/config
echo "aws_access_key_id $awsKeyId" >> ~/.aws/config
echo "aws_secret_access_key $awsAccessKey" >> ~/.aws/config

echo "aws region"
read awsRegion

echo "[default]" >> ~/.aws/config
echo "region = $awsRegion" >> ~/.aws/config

echo "server_id"
read serverId

echo "SERVER_ID = \"$serverId\"" >> .env

echo "server_address"
read serverAddress

echo "SERVER_ADDRESS = \"$serverAddress\"" >> .env
