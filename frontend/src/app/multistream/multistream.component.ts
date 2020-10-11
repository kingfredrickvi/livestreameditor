import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { Observable, interval } from 'rxjs';
import { VideoService } from '../video.service'
import { environment } from '../../environments/environment';
import { UserService } from '../user.service'
import { SocketioService } from '../socketio.service'

@Component({
  selector: 'app-multistream',
  templateUrl: './multistream.component.html',
  styleUrls: ['./multistream.component.css']
})
export class MultistreamComponent implements OnInit {

  public ngOnInit() {
    
  }

  // public streamId = "";
  // public video: any = {};
  // public apis: any = [];
  // @ViewChild('timeline', { static: true }) timeline;
  // @ViewChild('timelineDiv', { static: true }) timelineDiv;
  // public userData: any = {};

  // public data = {
  //   position: 0,
  //   isPaused: false,
  //   isPlaying: false,
  //   timelineWidth: 50,
  //   cutLeft: -1,
  //   cutRight: -1,
  //   cutStop: true,
  //   autoplay: false,
  //   autoplayPending: false,
  //   videoId: 0
  // };
  // public images: any = [{}];
  // public audioImages: any = [{}];
  // public ctxs: any = [];
  // public audioCtxs: any = [];
  // public audioImage;
  // public playingSub;
  // public pausedSub;
  // public lastPosition = 0;
  // public selectedSegment: any = {};
  // private currentSegmentSub;
  // public segments = [];
  // public newSegmentSub;
  // public deleteSegmentSub;
  // public loadingImage;
  // public staticUrl = environment.staticUrl;

  // constructor(private socketioService: SocketioService, private videoService: VideoService, private userService: UserService, private route: ActivatedRoute, private router: Router) {
  //   this.streamId = this.route.snapshot.paramMap.get('id');
    
  //   this.userService.userData.subscribe((data: any) => {
  //     if (data.ignore) return;
  //     this.userData = data;
  //   });

  //   this.loadingImage = new Image();
  //   this.loadingImage._loaded = false;
  //   this.loadingImage.onload = () => this.loadingImage._loaded = true;
  //   this.loadingImage.src = `${environment.staticUrl}/thumb_loading.jpg`;
  // }

  // sort() {
  //   this.segments = this.segments.sort(function(a, b) {
  //     return a.start - b.start;
  //   });
  // }

  // getCurrentTime() {
  //   if (this.apis[0]) {
  //     return this.apis[0].currentTime
  //   } else {
  //     return 0;
  //   }
  // }

  // getDuration(index) {
  //   return (this.apis[index].duration);
  // }

  // ngOnInit() {
  //   this.videoService.getSegments(this.streamId).subscribe((data: any) => {
  //     console.log("Segments", data);
  //     this.segments = data.segments.sort(function(a, b) {
  //       return a.start - b.start;
  //     });
  //   });

  //   this.newSegmentSub = this.socketioService.newSegments.subscribe((data) => {
  //     console.log("Heyo", data);
  //     if (!data.segment || this.streamId !== data.segment.video_uuid) return;

  //     var found = false;

  //     for (var i = 0; i < this.segments.length; i++) {
  //       if (this.segments[i].uuid == data.segment.uuid) {
  //         this.segments[i].start = data.segment.start;
  //         this.segments[i].end = data.segment.end;
  //         this.segments[i].status = data.segment.status;
  //         found = true;
  //         break;
  //       }
  //     }

  //     if (!found) {
  //       this.segments.push(data.segment);
  //     }

  //     if (this.selectedSegment.uuid == data.segment.uuid) {
  //       this.selectedSegment.start = data.segment.start;
  //       this.selectedSegment.end = data.segment.end;
  //       this.selectedSegment.status = data.segment.status;
  //     }

  //     this.sort();
  //   });

  //   this.deleteSegmentSub = this.socketioService.deleteSegments.subscribe((data) => {
  //     console.log("Heyo2", data);
  //     if (!data.segment || this.streamId !== data.segment.video_uuid) return;

  //     var found = false;

  //     this.segments = this.segments.filter(s => s.uuid !== data.segment.uuid);
  //   });

  //   this.videoService.getStream(this.streamId).subscribe((data: any) => {
  //     if (data.success === false || data.video.progress < 1) {
  //       this.router.navigateByUrl('/streams');
  //       return;
  //     }

  //     data.video.src = `${environment.staticUrl}/proxy/${this.streamId}.mp4`;
  //     this.video = data.video;
  //   });

  //   let ignoreFirst = true;
    
  //   this.currentSegmentSub = this.videoService.currentSegment.subscribe((segment: any) => {
  //     if (ignoreFirst) {
  //       ignoreFirst = false;
  //       return;
  //     }

  //     if (segment.uuid && (!segment.video_uuid || segment.video_uuid == this.streamId)) {
  //       this.selectedSegment = segment;
  //       this.data.cutLeft = segment.start;
  //       this.data.cutRight = segment.end;
  //       this.data.cutStop = true;
  //       this.animate(0);
  //       this.seek(segment.start);

  //       if (segment.autoplay) {
  //         if (!this.data.isPlaying) {
  //           this.playVideo();
  //         }
  //       }
  //     } else if (segment.empty) {
  //       this.selectedSegment = {};
  //       this.data.cutLeft = -1;
  //       this.data.cutRight = -1;
  //       this.animate(0);
  //     }
  //   });

  //   this.data = {
  //     position: 0,
  //     isPaused: false,
  //     isPlaying: false,
  //     timelineWidth: 50,
  //     cutLeft: -1,
  //     cutRight: -1,
  //     cutStop: true,
  //     autoplay: false,
  //     autoplayPending: false
  //   };

  //   this.ctx = this.timeline.nativeElement.getContext('2d');
  //   this.ctx.canvas.onselectstart = function () { return false; }

  //   this.timeline.nativeElement.addEventListener('click', (e) => {
  //     var x;
  //     var y;
  //     if (e.pageX || e.pageY) { 
  //       x = e.pageX;
  //       y = e.pageY;
  //     }
  //     else {
  //       x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft; 
  //       y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop; 
  //     } 
  //     x -= this.timeline.nativeElement.offsetLeft;
  //     y -= this.timeline.nativeElement.offsetTop;


  //     const w = this.data.timelineWidth;
  //     const numFrames = Math.floor(this.ctx.canvas.width / w);
  //     const numFrames2 = Math.floor(numFrames / 2);
  //     const pos = this.getCurrentTime();
  //     let posd = Math.floor(pos);
  //     let frame = Math.max(0, Math.floor((x/w)-numFrames2+posd-1));
  
  //     this.seek(frame);
  //   }, false);
    
  //   this.createPausedSub();

  //   this.onResize();
  // }

  // zoom(delta) {
  //   this.data.timelineWidth += delta;
  //   if (this.data.timelineWidth < 15) {
  //     this.data.timelineWidth = 15;
  //   }
  //   if (this.data.timelineWidth > 100) {
  //     this.data.timelineWidth = 100;
  //   }
  //   this.animate(0);
  // }

  // createPausedSub() {
  //   this.pausedSub = interval(250).subscribe(() => {
  //     const curr = this.getCurrentTime();

  //     if (!this.data.isPaused) {
  //       this.data.position = curr;
  //     }

  //     if (Math.abs(this.lastPosition - curr) > 0.20) {
  //       this.animate(0);
  //       this.lastPosition = curr;
  //     }
  //   });
  // }

  // ngOnDestroy() {
  //   if (this.playingSub) {
  //     this.playingSub.unsubscribe();
  //   }
  //   if (this.pausedSub) {
  //     this.pausedSub.unsubscribe();
  //   }
  //   if (this.currentSegmentSub) {
  //     this.currentSegmentSub.unsubscribe();
  //   }
  //   if (this.newSegmentSub) {
  //     this.newSegmentSub.unsubscribe();
  //   }
  //   this.newSegmentSub.unsubscribe();
  //   this.deleteSegmentSub.unsubscribe();
  // }
  
  // onResize() {
  //   for (const ctxIndex in this.ctxs) {
  //     this.ctxs[ctxIndex].canvas.width  = this.timelineDiv.nativeElement.clientWidth;
  //     this.ctxs[ctxIndex].canvas.height = this.timelineDiv.nativeElement.clientHeight;
      
  //     this.animate(ctxIndex);
  //   }

  // }

  // animate(index, triggerFrame=-1) {
  //   const pos = this.getCurrentTime();
  //   const w = this.data.timelineWidth;
  //   let posd = Math.floor(pos);
  //   let poshead = posd;

  //   if (pos == undefined) return;

  //   const numFrames = Math.ceil(this.ctx.canvas.width / w);
  //   const numFrames2 = Math.ceil(numFrames / 2);

  //   if (triggerFrame > 0 && (triggerFrame < (posd - numFrames2) || triggerFrame > (posd + numFrames2))) {
  //     return;
  //   }
    
  //   poshead = numFrames2;

  //   this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

  //   for (var i = -numFrames2; i < numFrames2+2; i++) {
  //     const frame = i+posd;
  //     const image = this.images[frame];
  //     const audioImage = this.audioImages[frame];

  //     if (frame < 0) continue;
  //     if (frame > this.api.duration) continue;

  //     let setOpacity = false;

  //     if (this.data.cutLeft > -1 && frame+1 < this.data.cutLeft) {
  //       this.ctx.globalAlpha = 0.2;
  //       setOpacity = true;
  //     }

  //     if (this.data.cutRight > -1 && frame > this.data.cutRight) {
  //       this.ctx.globalAlpha = 0.2;
  //       setOpacity = true;
  //     }

  //     if (image && image._loaded) {
  //       this.ctx.drawImage(image, image.width * 0.25, 0, image.width * 0.75, image.height, w*i+2+w*numFrames2, 0, w-2, this.ctx.canvas.height/2);
  //       // this.ctx.drawImage(image, 0, 0, image.width, image.height, w*i+2+w*numFrames2, 0, w-2, this.ctx.canvas.height);
  //     } else if (image == undefined) {
  //       this.images[frame] = new Image();
  //       this.images[frame].onload = () => {
  //         this.images[frame]._loaded = true;
  //         this.animate(index, posd + i);
  //       }
  //       this.images[frame].src = `${environment.staticUrl}/timeline/${this.streamId}/${frame+2}.jpg`;
      
  //       if (this.loadingImage._loaded) {
  //         this.ctx.drawImage(this.loadingImage, this.loadingImage.width * 0.25, 0, this.loadingImage.width * 0.75, this.loadingImage.height, w*i+2+w*numFrames2, 0, w-2, this.ctx.canvas.height/2);
  //       }
  //     } else if (this.loadingImage._loaded) {
  //       this.ctx.drawImage(this.loadingImage, this.loadingImage.width * 0.25, 0, this.loadingImage.width * 0.75, this.loadingImage.height, w*i+2+w*numFrames2, 0, w-2, this.ctx.canvas.height/2);
  //     }

  //     if (setOpacity) {
  //       this.ctx.globalAlpha = 1;
  //     }

  //     if (audioImage && audioImage._loaded) {
  //       this.ctx.drawImage(audioImage, 0, 0, audioImage.width, audioImage.height, w*i+2+w*numFrames2, this.ctx.canvas.height/2, w-2, this.ctx.canvas.height/2);
  //       // this.ctx.drawImage(image, 0, 0, image.width, image.height, w*i+2+w*numFrames2, 0, w-2, this.ctx.canvas.height);
  //     } else if (audioImage == undefined) {
  //       this.audioImages[frame] = new Image();
  //       this.audioImages[frame].onload = () => {
  //         this.audioImages[frame]._loaded = true;
  //         this.animate(0);
  //       }
  //       this.audioImages[frame].src = `${environment.staticUrl}/timeline_audio/${this.streamId}/${frame}.jpg`;
  //     }
  //   }

  //   this.ctx.strokeStyle = "red";
  //   this.ctx.lineWidth = 4;
  //   this.ctx.beginPath();
  //   this.ctx.moveTo((w*poshead)+1, 0);
  //   this.ctx.lineTo((w*poshead)+1, this.ctx.canvas.height);
  //   this.ctx.stroke();

  //   const rem = pos % 1;

  //   this.ctx.strokeStyle = "red";
  //   this.ctx.lineWidth = 2;
  //   this.ctx.beginPath();
  //   this.ctx.moveTo((w*poshead)+1+rem*w, 0);
  //   this.ctx.lineTo((w*poshead)+1+rem*w, this.ctx.canvas.height);
  //   this.ctx.stroke();

  //   if (this.data.cutLeft > -1) {
  //     const p = this.data.cutLeft - posd;
  //     this.ctx.strokeStyle = "#d35400";
  //     this.ctx.lineWidth = 4;
  //     this.ctx.beginPath();
  //     this.ctx.moveTo(w*p+2+w*numFrames2, 0);
  //     this.ctx.lineTo(w*p+2+w*numFrames2, this.ctx.canvas.height);
  //     this.ctx.stroke();
  //   }

  //   if (this.data.cutRight > -1) {
  //     const p = this.data.cutRight - posd;
  //     this.ctx.strokeStyle = "#d35400";
  //     this.ctx.lineWidth = 4;
  //     this.ctx.beginPath();
  //     this.ctx.moveTo(w*p+2+w*numFrames2, 0);
  //     this.ctx.lineTo(w*p+2+w*numFrames2, this.ctx.canvas.height);
  //     this.ctx.stroke();
  //   }
  // }

  // onPlayerReady(index, api: any) {
  //   this.apis[index] = api;
  //   this.apis[index].getDefaultMedia().subscriptions.loadedMetadata.subscribe(
  //     this.onResize.bind(this)
  //   );
  // }

  // playVideo(setPosition = true) {
  //   if (setPosition && !this.data.isPaused) {
  //     console.log("setting pause set pos")
  //     this.data.position = this.getCurrentTime();
  //   }

  //   if (this.data.isPlaying) {
  //     this.pauseVideo();
  //     return;
  //   }

  //   if (this.data.cutStop && this.data.cutRight > -1 && this.getCurrentTime() >= this.data.cutRight) {
  //     if (this.data.cutLeft > -1) {
  //       this.seek(this.data.cutLeft);
  //     }
  //   }

  //   this.api.play();
  //   this.data.isPlaying = true;
  //   this.data.isPaused = false;
  //   this.pausedSub.unsubscribe();
  //   this.pausedSub = undefined;
  //   this.playingSub = interval(50).subscribe(() => {
  //     const curr = this.getCurrentTime();

  //     if (this.data.cutStop && this.data.cutRight > -1 && curr >= this.data.cutRight) {
  //       if (this.selectedSegment.uuid && this.data.autoplay) {
  //         let found = false;
  //         let seeked = false;
  //         for (let segment of this.segments) {
  //           if (found && (segment.status == 2 || (segment.status == 0 && this.data.autoplayPending))) {
  //             this.videoService.viewSegment(segment);
  //             this.seek(segment.start);
  //             seeked = true;
  //             break;
  //           } else if (segment.uuid == this.selectedSegment.uuid) {
  //             found = true;
  //           }
  //         }
  //         if (found && !seeked) {
  //           this.pauseVideo(false);
  //         }
  //       } else if (this.data.cutLeft > -1) {
  //         this.pauseVideo(false);
  //         this.seek(this.data.cutLeft);
  //       } else {
  //         this.pauseVideo(false);
  //       }
  //     }

  //     if (Math.abs(this.lastPosition - curr) > 0.20) {
  //       this.animate(0);
  //       this.lastPosition = curr;
  //     }
  //   });

  //   this.animate(0);
  // }

  // pauseVideo(isPausing=true) {
  //   if (this.playingSub) {
  //     this.playingSub.unsubscribe();
  //     this.playingSub = undefined;
  //     this.createPausedSub();
  //   }

  //   if (this.data.isPlaying) {
  //     this.api.pause();
  //     this.data.isPlaying = false;
  //     this.data.isPaused = isPausing;
  //   } else {
  //     this.data.isPlaying = false;
  //     this.data.isPaused = false;
  //   }
  //   this.animate(0);
  // }

  // stopVideo() {
  //   if (this.playingSub) {
  //     this.playingSub.unsubscribe();
  //     this.playingSub = undefined;
  //     this.createPausedSub();
  //   }
    
  //   if (this.data.isPlaying) {
  //     this.api.seekTime(this.data.position);
  //   }

  //   this.api.pause();
  //   this.data.isPlaying = false;
  //   this.data.isPaused = false;
  //   this.animate(0);
  // }

  // deltaSeek(amount) {
  //   this.api.seekTime(this.getCurrentTime() + amount);
  //   this.animate(0);
  // }

  // seek(time) {
  //   this.api.seekTime(time);
  //   this.data.position = this.getCurrentTime();
  //   this.animate(0);
  // }

  // toggleCutStop() {
  //   this.data.cutStop = !this.data.cutStop;
  // }

  // cutLeft() {
  //   this.data.cutLeft = this.getCurrentTime();
  //   this.animate(0);
  // }

  // cutRight() {
  //   this.data.cutRight = this.getCurrentTime();
  //   console.log(this.data.cutRight)
  //   this.animate(0);
  // }

  // goCutLeft() {
  //   if (this.data.cutLeft > -1) {
  //     this.seek(this.data.cutLeft);
  //   }
  // }

  // goCutRight() {
  //   if (this.data.cutRight > -1) {
  //     this.seek(this.data.cutRight);
  //   }
  // }

  // approve(segment) {
  //   this.videoService.saveSegment(segment.uuid, undefined, undefined, 1).subscribe((data) => {
  //   });
  // }

  // decline(segment) {
  //   this.videoService.saveSegment(segment.uuid, undefined, undefined, 2).subscribe((data) => {
  //   });
  // }

  // unknown(segment) {
  //   this.videoService.saveSegment(segment.uuid, undefined, undefined, 0).subscribe((data) => {
  //   });
  // }

  // addCut() {
  //   if (this.data.cutLeft > -1 && this.data.cutRight > -1 && this.data.cutLeft < this.data.cutRight) {
  //     this.videoService.addSegment(this.streamId, this.data.cutLeft, this.data.cutRight).subscribe((data) => {
  //       console.log("Add cut", data);
  //       this.animate(0);
  //     });

  //     this.seek(this.data.cutRight);

  //     this.data.cutLeft = -1;
  //     this.data.cutRight = -1;
  //     this.data.cutStop = false;
  //     this.videoService.viewSegment({empty: true});
  //   }
  // }

  // saveCut() {
  //   if (this.data.cutLeft > -1 && this.data.cutRight > -1  && this.data.cutLeft < this.data.cutRight) {
  //     this.videoService.saveSegment(this.selectedSegment.uuid, this.data.cutLeft, this.data.cutRight).subscribe((data: any) => {
  //       console.log("Save cut", data);
  //       this.animate(0);
  //     });

  //     this.seek(this.data.cutRight);

  //     this.data.cutLeft = -1;
  //     this.data.cutRight = -1;
  //     this.data.cutStop = false;

  //     this.videoService.viewSegment({empty: true});
  //   }
  // }

  // setThumbnail() {
  //   if (confirm("Are you sure you would like to set the thumbnail?")) {
  //     this.videoService.setThumbnail(this.streamId, this.getCurrentTime()).subscribe((data: any) => {
  //       console.log(data);
  //     });
  //   }
  // }

  // export() {
  //   if (confirm("Are you sure you would like to generate an artifact?")) {
  //     this.videoService.generateArtifact(this.streamId).subscribe((data: any) => {
  //       console.log(data);
  //       this.router.navigateByUrl('/artifacts');
  //     });
  //   }
  // }
}
