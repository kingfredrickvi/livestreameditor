
FROM jrottenberg/ffmpeg:4.1-ubuntu1804
RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections
RUN apt-get -y update
RUN apt-get install -y python3-pip zip awscli wget
RUN pip3 install boto3 numpy pillow moviepy
RUN wget https://yt-dl.org/latest/youtube-dl -O /usr/local/bin/youtube-dl
RUN chmod a+x /usr/local/bin/youtube-dl
RUN ln -s /usr/bin/python3 /usr/local/bin/python
RUN mkdir ~/.aws

ADD main.py main.py

ENTRYPOINT ["python3", "main.py"]
