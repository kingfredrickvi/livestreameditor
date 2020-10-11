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

  private userData = [];
  private servers = [];
  private activeServer;
  
  ngOnInit() {
    
    this.userService.userData.subscribe((data: any) => {
      if (data.ignore) return;
      this.userData = [data];
    });

    this.userService.serverData.subscribe((data: any) => {
      if (data.ignore) return;
      this.activeServer = data.find(s => s.uid == this.userService.getServer().uid).uid;
      this.servers = data;
    });
  }
  
  updateActiveServer() {
    console.log("New server", this.activeServer);
    this.userService.saveServer(this.servers.find(s => s.uid == this.activeServer));
  }
}
