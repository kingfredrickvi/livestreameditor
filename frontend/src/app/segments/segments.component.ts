import { Component, OnInit, Input } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { VideoService } from '../video.service'
import { SocketioService } from '../socketio.service'
import { UserService } from '../user.service'
import { environment } from '../../environments/environment';

// Check if over duration for thumbnails
// Add hover popups like "trim"
// Drag timeline
// Add hotkeys
// auto play segments
// Had a little bug there viewing segments
// If you're clip is deleted while viewing it, handle that?

// Click on a user and see just their vods
// Unsubscribe from everything lol
//      looks like when you come back it doesn't reset
//      the start end and gets confused.

// Below the clip thingy add a list of every time someone
//           approved or unapproved a clip. Like an audit log
// Place to give feedback or suggestions
// Undo button
// Add ability to upload to different youtube accounts.
// Add user thumbnail overlay

@Component({
  selector: 'app-segments',
  templateUrl: './segments.component.html',
  styleUrls: ['./segments.component.css']
})
export class SegmentsComponent implements OnInit {

  @Input() public segments: any = [];
  @Input() public segmentTimes: any = 0;
  public selectedSegment: any = {};
  public streamId;
  public tab = 0;
  public userData: any = {};
  public staticUrl = environment.staticUrl;

  constructor(private socketioService: SocketioService, private videoService: VideoService, private userService: UserService, private route: ActivatedRoute, private router: Router) {
    this.streamId = this.route.snapshot.paramMap.get('id');

    let skipFirst = true;

    this.videoService.currentSegment.subscribe((segment: any) => {
      if (skipFirst) {
        skipFirst = false;
        return;
      }

      if (segment.uid) {
        this.selectedSegment = segment
      } else if (segment.empty) {
        this.selectedSegment = {};
      }
    });
    
    this.userService.userData.subscribe((data: any) => {
      if (data.ignore) return;
      console.log("User data", data);
      this.userData = data;
    });
  }

  ngOnInit() {
    this.staticUrl = environment.staticUrl;
  }

  ngOnDestroy() {
  }

  viewSegment(segment, autoplay=false) {
    if (!segment.empty) {
      window.scrollTo(0, 125);
    }

    this.videoService.viewSegment(Object.assign({autoplay}, segment));
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

  delete(segment) {
    if (confirm("Are you sure you would like to delete this?")) {
      if (segment.uid == this.selectedSegment.uid) {
        this.viewSegment({empty: true});
      }
      this.videoService.deleteSegment(segment.uid).subscribe((data) => {
        console.log("Deleted");
      })
    }
  }
}
