import { Component, OnInit } from '@angular/core';
import { StreamersService } from '../streamers.service'

@Component({
  selector: 'app-streamers',
  templateUrl: './streamers.component.html',
  styleUrls: ['./streamers.component.css']
})
export class StreamersComponent implements OnInit {

  public streamers = [];
  public streamerGroups = [];
  public add = {
    username: "",
    direct_link: "",
    pfp: "",
    platform: "",
    platform_username: "",
    uid: false,
    streamer_group: "",
    width: 480,
    end_card: "",
    thumbnail: "",
    crf: 21,
    active: 1
  };
  public addOpen = false;

  constructor(private streamersService: StreamersService) { }

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.streamersService.getStreamers().subscribe((data: any) => {
      this.streamers = data.streamers;
    });
    this.streamersService.getStreamerGroups().subscribe((data: any) => {
      this.streamerGroups = data.streamer_groups;
    });
  }

  updateGroup(streamer, newGroup) {
    this.streamersService.updateStreamer({uid: streamer.uid, streamer_group: newGroup}).subscribe((data: any) => {
      console.log(data);
    });
  }

  openEdit() {
    this.addOpen = true;
    this.add = {
      username: "",
      direct_link: "",
      pfp: "",
      platform: "",
      platform_username: "",
      uid: false,
      streamer_group: "",
      width: 480,
      end_card: "",
      thumbnail: "",
      crf: 21,
      active: 1
    };
  }

  edit(streamer) {
    this.addOpen = true;
    this.add = streamer;
  }

  addStreamer() {
    console.log(this.add.uid);
    if (this.add.uid) {
      this.streamersService.updateStreamer(this.add).subscribe((data: any) => {
        this.addOpen = false;
        this.add = {
          username: "",
          direct_link: "",
          pfp: "",
          platform: "",
          platform_username: "",
          uid: false,
          streamer_group: "",
          width: 480,
          end_card: "",
          thumbnail: "",
          crf: 21,
          active: 1
        };
        this.refresh();
      });
    } else {
      this.add.uid = undefined;
      this.streamersService.addStreamer(this.add).subscribe((data: any) => {
        this.addOpen = false;
        this.add = {
          username: "",
          direct_link: "",
          pfp: "",
          platform: "",
          platform_username: "",
          uid: false,
          streamer_group: "",
          width: 480,
          end_card: "",
          thumbnail: "",
          crf: 21,
          active: 1
        };
        this.refresh();
      });
    }
  }
}
