import { Component, OnInit } from '@angular/core';
import { VideosService } from '../videos.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { SocketioService } from '../socketio.service'
import { StreamersService } from '../streamers.service'

@Component({
  selector: 'app-streams',
  templateUrl: './streams.component.html',
  styleUrls: ['./streams.component.css']
})
export class StreamsComponent implements OnInit {

  public videos: any = [];
  public filteredVideos: any = [];
  public staticUrl = environment.staticUrl;
  public restricted = false;
  private videoSub;
  public moreToLoad = false;
  public streamers;
  public streamerFilter;
  public search;

  constructor(private streamersService: StreamersService, private socketioService: SocketioService, private videosService: VideosService, private router: Router) { }

  ngOnInit() {
    this.staticUrl = environment.staticUrl;
    this.videosService.getStreams().subscribe((data: any) => {
      console.log(data);

      if (data.success === false) {
        this.restricted = true;
      }

      this.moreToLoad = data.more_results;

      this.videos = data.videos;
      this.filterVideos();
    }, error => {
      console.log(error);
    });

    this.streamersService.getStreamers().subscribe((data: any) => {
      this.streamers = data.streamers;
    });

    this.videoSub = this.socketioService.videos.subscribe((data) => {
      if (!data.video) return;
      
      const videoIndex = this.videos.findIndex(v => v.uid === data.video.uid);
      this.videos[videoIndex] = Object.assign(this.videos[videoIndex], data.video);
    });
  }

  filterVideos() {
    console.log(this.streamerFilter, this.videos);
    this.filteredVideos = this.videos.filter(v =>
      (!this.streamerFilter || v.username === this.streamerFilter) &&
      (!this.search || v.title.toLowerCase().includes(this.search.toLowerCase()))
    )
  }

  updateFilter() {
    this.filterVideos();
  }

  updateSearch() {
    this.filterVideos();
  }

  loadMore() {
    this.videosService.getStreams(this.videos[this.videos.length - 1].uid).subscribe((data: any) => {
      console.log(data);

      if (data.success === false) {
        this.restricted = true;
      }

      this.moreToLoad = data.more_results;

      this.videos = this.videos.concat(data.videos);
      this.filterVideos();
    }, error => {
      console.log(error);
    });
  }

  ngOnDestroy() {
    this.videoSub.unsubscribe();
  }
}
