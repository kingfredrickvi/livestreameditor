
wget -O build.zip "$1"
unzip -o build.zip

sudo rm -rf /dist
sudo mkdir -p /dist
sudo mv dist/livestreameditor/* /dist
rm -rf dist
sudo chown -R www-data:www-data /dist
