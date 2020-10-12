import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service'
import { StreamersService } from '../streamers.service'

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

  constructor(private userService: UserService, private streamersService: StreamersService) { }

  public userData: any = [];
  public servers: any = [];
  public activeServer: any;
  serversCalculated = 0;
  
  nextServer(servers) {
    const server = servers[this.serversCalculated];

    if (!server) {
      return;
    }

    if (+server.active) {
      const img = new Image();
      let start;
      img.onload = () => {
        let end = new Date().getTime();
        server.speed = end - start;
        this.serversCalculated++
        this.nextServer(servers);
      };
      img.onerror = () => {
        server.active = false;
        this.serversCalculated++
        this.nextServer(servers);
      };
      start = new Date().getTime();
      img.src = `${server.address}/static/mypeas.jpg?time=${start}`;
    } else {
      this.serversCalculated++
      this.nextServer(servers);
    }
  }

  ngOnInit() {
    this.userService.userData.subscribe((data: any) => {
      if (data.ignore) return;
      this.userData = [data];
    });

    this.userService.serverData.subscribe((data: any) => {
      if (data.ignore) return;
      this.activeServer = data.find(s => s.uid == this.userService.getServer().uid).uid;
      this.serversCalculated = 0;
      this.nextServer(data);
      this.servers = data;
    });
  }
  
  updateActiveServer() {
    console.log("New server", this.activeServer);
    this.userService.saveServer(this.servers.find(s => s.uid == this.activeServer));
  }
}
