
# Live Stream Editor

Livestream Editor is a cloud-based web application that allows the community to collaberatively edit the highlights for streamers with other members in the community in real time. As new highlights are added, other editors instantly see them in their list. The web application is lightweight and works on most browsers, phones and tablets.

![Overview Image](https://github.com/kingfredrickvi/livestreameditor/blob/main/backend/static_images/home1.jpg)

Check out the official website here:

https://livestreameditor.com

## Deployment

Deploying this is very complex in order to keep costs as low as possible. What you're going to need:

* An AWS account http://console.aws.amazon.com/
* A Backblaze B2 account https://www.backblaze.com/b2/cloud-storage.html
* A VPS service (I prefer https://www.vultr.com/ )
* A twitch acccount
* A domain (I prefer https://domains.google/ )

Add or remove security measures as you see fit (such as IAMs).

### Reasoning

Livestreams can get very big, fast. A 4 hour stream can be as large as 10 GB. B2 is $0.005 vs S3 is $0.0125 for infrequent per month. That's double the cost. The only MUCH larger issue is bandwidth costs. When a video is rendered, the server has to download the entire video. B2 is $0.01 per GB for bandwidth, AWS is $0.07. That means for a 10 GB file it's 70 cents to download is vs 7 cents with backblaze.

### BackBlaze

1. Create a bucket called 'livestreameditor'. 
1. Create an API key. Write down the key and ID

### AWS

1. Generate an ID and key in IAM. Write them down somewhere.
1. Go to Dynamodb
1. Create 6 new tables. Uncheck use default settings every time. Make read/write capacity on-demand.
    1. lse-artifacts
    1. lse-segments
    1. lse-streamer-groups
    1. lse-streamers
    1. lse-users
    1. lse-videos
1. Create a new queue `lse-download.fifo`. Make it FIFO. Receive message wait time 20. Basic. 
1. Create a new SNS topic `lse-database`.

### Twitch

1. Create a new Twitch application https://dev.twitch.tv/console/apps/create
1. Create a new client secret and write it down.

### VPS

Go to your favorite VPS provider (I prefer https://www.vultr.com over DigitalOcean)

You can also use an EC2 on AWS but you'll most likely end up paying quite a bit if people are heavily using your website.

1. Create a new VM. It can be small (1 CPU / 1GB RAM). The major thing is the disk space. The more disk space, the more hot projects you can have at once. A 4 hour stream is about 450 MB. 
    1. If you want to use the `install.sh` choose ubuntu-18. 
    1. Upload an ssh key if you don't have one uploaded already dummy.
    1. Firewall: port 22 your IP, port 80/443 open to everyone.
1. Update your domain so that the @ points to the VM's IP and make an additional unique subdomain just for this VM (eg usny1.livestreameditor.com)
1. SSH into the machine.
1. `wget https://raw.githubusercontent.com/kingfredrickvi/livestreameditor/main/backend/install.sh`
1. `chmod +x install.sh && ./install.sh`
1. Enter in the info.
    1. For aws region, eg `us-east-1` (make sure everything is in same region).
    1. server ID is anything but should be unqiue to that server and be identifiable. The user can see this name. Only use letters and dashes.
    1. The server address is the full domain, eg `https://livestreameditor.com`
    1. hostname is just the name, eg `livestreameditor`.