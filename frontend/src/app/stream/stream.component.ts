import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Observable, interval } from 'rxjs';
import { VideoService } from '../video.service'
import { environment } from '../../environments/environment';
import { UserService } from '../user.service'
import { SocketioService } from '../socketio.service'

@Component({
  selector: 'app-stream',
  templateUrl: './stream.component.html',
  styleUrls: ['./stream.component.css']
})
export class StreamComponent implements OnInit {

  public streamId = "";
  public video: any = {};
  public api: any = {};
  @ViewChild('timeline', { static: false }) timeline;
  @ViewChild('timelineDiv', { static: false }) timelineDiv;
  public userData: any = {};

  public data = {
    position: 0,
    isPaused: false,
    isPlaying: false,
    timelineWidth: 50,
    cutLeft: -1,
    cutRight: -1,
    cutStop: true,
    autoplay: false,
    autoplayPending: false
  };
  public images: any = {};
  public audioImages: any = {};
  public ctx;
  public audioCtx;
  public audioImage;
  public playingSub;
  public pausedSub;
  public lastPosition = 0;
  public selectedSegment: any = {};
  private currentSegmentSub;
  public segments = [];
  public newSegmentSub;
  public deleteSegmentSub;
  public videoSub;
  public loadingImage;
  public staticUrl = environment.staticUrl;
  public requestDraw = false;
  public requestDrawSub;
  public updateSpeed = 1/15;
  public segmentTimes = 0;

  constructor(private socketioService: SocketioService, private videoService: VideoService, private userService: UserService, private route: ActivatedRoute, private router: Router) {
    this.streamId = this.route.snapshot.paramMap.get('id');
    
    this.userService.userData.subscribe((data: any) => {
      if (data.ignore) return;
      this.userData = data;
    });

    this.loadingImage = new Image();
    this.loadingImage._loaded = false;
    this.loadingImage.onload = () => this.loadingImage._loaded = true;
    this.loadingImage.src = `${environment.staticUrl}/thumb_loading.jpg`;
  }

  sort() {
    this.segments = this.segments.sort(function(a, b) {
      return a.start - b.start;
    });

    let time = 0;
    for (const segment of this.segments) {
      if (segment.status == 2) {
        time += segment.end - segment.start;
      }
    }

    this.segmentTimes = time;
    console.log("Times", this.segmentTimes);
  }

  coolVideo() {
    if (confirm("Are you sure you would like to cool the video?")) {
      this.videoService.coolVideo(this.streamId).subscribe((data: any) => {
        // video.cold_storage = 1;
        console.log("Got good result back");
      });
    }
  }

  warmVideo(video) {
    this.videoService.warmVideo(video.uid).subscribe((data: any) => {
      // video.cold_storage = 1;
      console.log("Got good result back");
    });
  }

  ngOnInit() {
    this.staticUrl = environment.staticUrl;
    this.videoService.getSegments(this.streamId).subscribe((data: any) => {
      this.segments = data.segments;
      this.sort();
    });

    this.newSegmentSub = this.socketioService.newSegments.subscribe((data) => {
      if (!data.segment || this.streamId !== data.segment.video_uid) return;

      var found = false;

      for (var i = 0; i < this.segments.length; i++) {
        if (this.segments[i].uid == data.segment.uid) {
          this.segments[i].start = data.segment.start;
          this.segments[i].end = data.segment.end;
          this.segments[i].status = data.segment.status;
          found = true;
          break;
        }
      }

      if (!found) {
        this.segments.push(data.segment);
      }

      if (this.selectedSegment.uid == data.segment.uid) {
        this.selectedSegment.start = data.segment.start;
        this.selectedSegment.end = data.segment.end;
        this.selectedSegment.status = data.segment.status;
      }

      this.sort();
    });

    this.deleteSegmentSub = this.socketioService.deleteSegments.subscribe((data) => {
      if (!data.segment || this.streamId !== data.segment.video_uid) return;

      var found = false;

      this.segments = this.segments.filter(s => s.uid !== data.segment.uid);
    });

    this.videoSub = this.socketioService.videos.subscribe((data) => {
      if (!data.video || this.streamId !== data.video.uid) return;

      data.video.src = `${environment.staticUrl}/proxy/${this.streamId}.mp4`;
      this.video = data.video;

      if (this.video.cold_storage == 0) {
        if (!this.ctx) {
          setTimeout(() => {
            this.addCanvas();
          }, 50);
        }
      }
    });

    this.videoService.getStream(this.streamId).subscribe((data: any) => {
      if (data.success === false || data.video.progress < 1) {
        this.router.navigateByUrl('/streams');
        return;
      }

      if (data.video.cold_storage == 0) {
        setTimeout(() => {
          this.addCanvas();
          data.video.src = `${environment.staticUrl}/proxy/${this.streamId}.mp4`;
        }, 50);
      }
      this.video = data.video;
    });

    this.data = {
      position: 0,
      isPaused: false,
      isPlaying: false,
      timelineWidth: 50,
      cutLeft: -1,
      cutRight: -1,
      cutStop: true,
      autoplay: false,
      autoplayPending: false
    };
  }

  addCanvas() {
    this.requestDrawSub = interval(this.updateSpeed).subscribe(() => {
      if (this.requestDraw) {
        this.requestDraw = false;
        this._animate();
      }
    });

    let ignoreFirst = true;
    
    this.currentSegmentSub = this.videoService.currentSegment.subscribe((segment: any) => {
      if (ignoreFirst) {
        ignoreFirst = false;
        return;
      }

      if (segment.uid && (!segment.video_uid || segment.video_uid == this.streamId)) {
        this.selectedSegment = segment;
        this.data.cutLeft = segment.start;
        this.data.cutRight = segment.end;
        this.data.cutStop = true;
        this.animate();
        this.seek(segment.start);

        if (segment.autoplay) {
          if (!this.data.isPlaying) {
            this.playVideo();
          }
        }
      } else if (segment.empty) {
        this.selectedSegment = {};
        this.data.cutLeft = -1;
        this.data.cutRight = -1;
        this.animate();
      }
    });

    this.ctx = this.timeline.nativeElement.getContext('2d');
    this.ctx.canvas.onselectstart = function () { return false; }

    this.timeline.nativeElement.addEventListener('click', (e) => {
      var x;
      var y;
      if (e.pageX || e.pageY) { 
        x = e.pageX;
        y = e.pageY;
      }
      else {
        x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft; 
        y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop; 
      } 
      x -= this.timeline.nativeElement.offsetLeft;
      y -= this.timeline.nativeElement.offsetTop;


      const w = this.data.timelineWidth;
      const numFrames = Math.floor(this.ctx.canvas.width / w);
      const numFrames2 = Math.floor(numFrames / 2);
      const pos = this.api.currentTime;
      let posd = Math.floor(pos);
      let frame = Math.max(0, Math.floor((x/w)-numFrames2+posd-1));
  
      this.seek(frame);
    }, false);
    
    this.createPausedSub();

    this.onResize();
  }

  zoom(delta) {
    this.data.timelineWidth += delta;
    if (this.data.timelineWidth < 15) {
      this.data.timelineWidth = 15;
    }
    if (this.data.timelineWidth > 100) {
      this.data.timelineWidth = 100;
    }
    this.animate();
  }

  createPausedSub() {
    this.pausedSub = interval(250).subscribe(() => {
      const curr = this.api.currentTime;

      if (!this.data.isPaused) {
        this.data.position = curr;
      }

      if (Math.abs(this.lastPosition - curr) > 0.20) {
        this.animate();
        this.lastPosition = curr;
      }
    });
  }

  ngOnDestroy() {
    if (this.playingSub) {
      this.playingSub.unsubscribe();
    }
    if (this.pausedSub) {
      this.pausedSub.unsubscribe();
    }
    if (this.currentSegmentSub) {
      this.currentSegmentSub.unsubscribe();
    }
    if (this.newSegmentSub) {
      this.newSegmentSub.unsubscribe();
    }
    if (this.newSegmentSub) {
      this.newSegmentSub.unsubscribe();
    }
    if (this.deleteSegmentSub) {
      this.deleteSegmentSub.unsubscribe();
    }
    if (this.requestDrawSub) {
      this.requestDrawSub.unsubscribe();
    }
    if (this.videoSub) {
      this.videoSub.unsubscribe();
    }
  }
  
  onResize() {
    this.ctx.canvas.width  = this.timelineDiv.nativeElement.clientWidth;
    this.ctx.canvas.height = this.timelineDiv.nativeElement.clientHeight;
    this.animate();
  }

  animate() {
    this.requestDraw = true;
  }

  _animate() {
    const pos = this.api.currentTime;
    const rem = pos % 1;
    const w = this.data.timelineWidth;
    let posd = Math.floor(pos);
    let poshead = posd;

    if (pos == undefined) return;

    const numFrames = Math.ceil(this.ctx.canvas.width / w);
    const numFrames2 = Math.ceil(numFrames / 2);

    poshead = numFrames2;

    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    for (let frameIndex in this.images) {
      if (Math.abs(+frameIndex - posd) > (numFrames2+20)) {
        const image = this.images[frameIndex];

        if (!image._loaded) {
          image.cancelled = true;
          image.src = "";
          delete this.images[frameIndex];
        } else {
          delete this.images[frameIndex];
        }
      }
    }

    for (let frameIndex in this.audioImages) {
      if (Math.abs(+frameIndex - posd) > (numFrames2+20)) {
        const image = this.audioImages[frameIndex];

        if (!image._loaded) {
          image.cancelled = true;
          image.src = "";
          delete this.audioImages[frameIndex];
        } else {
          delete this.audioImages[frameIndex];
        }
      }
    }

    for (var i = -numFrames2; i < numFrames2+2; i++) {
      const frame = i+posd;
      const image = this.images[frame];
      const audioImage = this.audioImages[frame];

      if (frame < 0) continue;
      if (frame > this.api.duration) continue;

      if (image && image._loaded) {
        this.ctx.drawImage(image, image.width * 0.25, 0, image.width * 0.75, image.height, (w*i+2+w*numFrames2), 0, (w-2), this.ctx.canvas.height/2);
        // this.ctx.drawImage(image, 0, 0, image.width, image.height, w*i+2+w*numFrames2, 0, w-2, this.ctx.canvas.height);
      } else if (image == undefined) {
        this.images[frame] = new Image();
        this.images[frame].cancelled = false;
        this.images[frame].onload = () => {
          this.images[frame]._loaded = true;
          if (!this.images[frame].cancelled) {
            this.animate();
          }
        }
        this.images[frame].src = `${environment.staticUrl}/timeline/${this.streamId}/${frame+2}.jpg`;
      
        if (this.loadingImage._loaded) {
          this.ctx.drawImage(this.loadingImage, this.loadingImage.width * 0.25, 0, this.loadingImage.width * 0.75, this.loadingImage.height, (w*i+2+w*numFrames2), 0, w-2, this.ctx.canvas.height/2);
        }
      } else if (this.loadingImage._loaded) {
        this.ctx.drawImage(this.loadingImage, this.loadingImage.width * 0.25, 0, this.loadingImage.width * 0.75, this.loadingImage.height, (w*i+2+w*numFrames2), 0, w-2, this.ctx.canvas.height/2);
      }

      if (audioImage && audioImage._loaded) {
        this.ctx.drawImage(audioImage, 0, 0, audioImage.width, audioImage.height, (w*i+2+w*numFrames2), this.ctx.canvas.height/2, w-2, this.ctx.canvas.height/2);
        // this.ctx.drawImage(image, 0, 0, image.width, image.height, w*i+2+w*numFrames2, 0, w-2, this.ctx.canvas.height);
      } else if (audioImage == undefined) {
        this.audioImages[frame] = new Image();
        this.audioImages[frame].cancelled = false;
        this.audioImages[frame].onload = () => {
          this.audioImages[frame]._loaded = true;
          if (!this.audioImages[frame].cancelled) {
            this.animate();
          }
        }
        this.audioImages[frame].src = `${environment.staticUrl}/timeline_audio/${this.streamId}/${frame}.jpg`;
      }
    }

    const pL = this.data.cutLeft - posd;
    const pR = this.data.cutRight - posd;

    if (this.data.cutLeft > -1 && pL+numFrames2 > 0) {
      this.ctx.fillStyle = "rgba(33, 33, 33, 0.75)";
      this.ctx.fillRect(0, 0, (w*pL+2+w*numFrames2), this.ctx.canvas.height);

      this.ctx.strokeStyle = "#d35400";
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo((w*pL+2+w*numFrames2), 0);
      this.ctx.lineTo((w*pL+2+w*numFrames2), this.ctx.canvas.height);
      this.ctx.stroke();
    }

    if (this.data.cutRight > -1 && numFrames2-pR > 0) {
      this.ctx.fillStyle = "rgba(33, 33, 33, 0.75)";
      this.ctx.fillRect((w*pR+2+w*numFrames2), 0, this.ctx.canvas.width+(w*pos), this.ctx.canvas.height+(w*pos));

      this.ctx.strokeStyle = "#d35400";
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo((w*pR+2+w*numFrames2), 0);
      this.ctx.lineTo((w*pR+2+w*numFrames2), this.ctx.canvas.height);
      this.ctx.stroke();
    }
    
    this.ctx.strokeStyle = "red";
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo((w*poshead)+1+(rem*w), 0);
    this.ctx.lineTo((w*poshead)+1+(rem*w), this.ctx.canvas.height);
    this.ctx.stroke();
  }

  onPlayerReady(api: any) {
    this.api = api;
    this.api.getDefaultMedia().subscriptions.loadedMetadata.subscribe(
      this.onResize.bind(this)
    );
  }

  playVideo(setPosition = true) {
    if (setPosition && !this.data.isPaused) {
      this.data.position = this.api.currentTime;
    }

    if (this.data.isPlaying) {
      this.pauseVideo();
      return;
    }

    if (this.data.cutStop && this.data.cutRight > -1 && this.api.currentTime >= this.data.cutRight) {
      if (this.data.cutLeft > -1) {
        this.seek(this.data.cutLeft);
      }
    }

    this.api.play();
    this.data.isPlaying = true;
    this.data.isPaused = false;
    this.pausedSub.unsubscribe();
    this.pausedSub = undefined;
    this.playingSub = interval(this.updateSpeed).subscribe(() => {
      const curr = this.api.currentTime;

      if (this.data.cutStop && this.data.cutRight > -1 && curr >= this.data.cutRight) {
        if (this.selectedSegment.uid && this.data.autoplay) {
          let found = false;
          let seeked = false;
          for (let segment of this.segments) {
            if (found && (segment.status == 2 || (segment.status == 0 && this.data.autoplayPending))) {
              this.videoService.viewSegment(segment);
              this.seek(segment.start);
              seeked = true;
              break;
            } else if (segment.uid == this.selectedSegment.uid) {
              found = true;
            }
          }
          if (found && !seeked) {
            this.pauseVideo(false);
          }
        } else if (this.data.cutLeft > -1) {
          this.pauseVideo(false);
          this.seek(this.data.cutLeft);
        } else {
          this.pauseVideo(false);
        }
      }

      if (Math.abs(this.lastPosition - curr) > 0.20) {
        this.animate();
        this.lastPosition = curr;
      }
    });

    this.animate();
  }

  pauseVideo(isPausing=true) {
    if (this.playingSub) {
      this.playingSub.unsubscribe();
      this.playingSub = undefined;
      this.createPausedSub();
    }

    if (this.data.isPlaying) {
      this.api.pause();
      this.data.isPlaying = false;
      this.data.isPaused = isPausing;
    } else {
      this.data.isPlaying = false;
      this.data.isPaused = false;
    }
    this.animate();
  }

  stopVideo() {
    if (this.playingSub) {
      this.playingSub.unsubscribe();
      this.playingSub = undefined;
      this.createPausedSub();
    }
    
    if (this.data.isPlaying) {
      this.api.seekTime(this.data.position);
    }

    this.api.pause();
    this.data.isPlaying = false;
    this.data.isPaused = false;
    this.animate();
  }

  deltaSeek(amount) {
    this.api.seekTime(this.api.currentTime + amount);
    this.animate();
  }

  seek(time) {
    this.api.seekTime(time);
    this.data.position = this.api.currentTime;
    this.animate();
  }

  toggleCutStop() {
    this.data.cutStop = !this.data.cutStop;
  }

  cutLeft() {
    this.data.cutLeft = this.api.currentTime;
    this.animate();
  }

  cutRight() {
    this.data.cutRight = this.api.currentTime;
    console.log(this.data.cutRight)
    this.animate();
  }

  goCutLeft() {
    if (this.data.cutLeft > -1) {
      this.seek(this.data.cutLeft);
    }
  }

  goCutRight() {
    if (this.data.cutRight > -1) {
      this.seek(this.data.cutRight);
    }
  }

  approve(segment) {
    this.videoService.saveSegment(segment.uid, undefined, undefined, 1).subscribe((data) => {
    });
  }

  decline(segment) {
    this.videoService.saveSegment(segment.uid, undefined, undefined, 2).subscribe((data) => {
    });
  }

  unknown(segment) {
    this.videoService.saveSegment(segment.uid, undefined, undefined, 0).subscribe((data) => {
    });
  }

  addCut() {
    if (this.data.cutLeft > -1 && this.data.cutRight > -1 && this.data.cutLeft < this.data.cutRight) {
      this.videoService.addSegment(this.streamId, this.data.cutLeft, this.data.cutRight).subscribe((data) => {
        console.log("Add cut", data);
        this.animate();
      });

      this.seek(this.data.cutRight);

      this.data.cutLeft = -1;
      this.data.cutRight = -1;
      this.data.cutStop = false;
      this.videoService.viewSegment({empty: true});
    }
  }

  saveCut() {
    if (this.data.cutLeft > -1 && this.data.cutRight > -1  && this.data.cutLeft < this.data.cutRight) {
      this.videoService.saveSegment(this.selectedSegment.uid, this.data.cutLeft, this.data.cutRight).subscribe((data: any) => {
        console.log("Save cut", data);
        this.animate();
      });

      this.seek(this.data.cutRight);

      this.data.cutLeft = -1;
      this.data.cutRight = -1;
      this.data.cutStop = false;

      this.videoService.viewSegment({empty: true});
    }
  }

  setThumbnail() {
    if (confirm("Are you sure you would like to set the thumbnail?")) {
      this.videoService.setThumbnail(this.streamId, this.api.currentTime).subscribe((data: any) => {
        console.log(data);
      });
    }
  }

  export() {
    if (confirm("Are you sure you would like to generate an artifact?")) {
      this.videoService.generateArtifact(this.streamId).subscribe((data: any) => {
        console.log(data);
        this.router.navigateByUrl('/artifacts');
      });
    }
  }
}
