import { Component } from '@angular/core';
import { UserService } from './user.service'
import { SocketioService } from './socketio.service'
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  public title = 'Livestream Editor';
  public userData: any = {};
  public showAdmin: boolean = false;
  public showAccount: boolean = false;
  public servers: any = [];
  private serversCalculated = 0;

  constructor(private userService: UserService, private location: Location, private router: Router, private socketService: SocketioService) {
    this.userService.updateData();
  }

  doServerResults(servers) {
    let fastest = servers.find(s => +s.active);

    for (const server of servers) {
      if (+server.active && server.speed < fastest.speed) {
        fastest = server;
      }
    }

    this.userService.serverData.next(servers);
    this.userService.saveServer(fastest);
  }

  nextServer(servers) {
    const server = servers[this.serversCalculated];

    if (!server) {
      return this.doServerResults(servers);
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
    this.socketService.setupSocketConnection();

    this.userService.userData.subscribe((data: any) => {
      if (data.ignore) return;

      const p = this.location.path();

      if (!data.success && p !== "/login" && p !== "/twitch_oauth" && p !== "/logout" && p !== "/" && p !== "") {
        console.log("url", p)
        this.router.navigateByUrl('/login');
      }
      
      this.userService.getServers().subscribe((data: any) => {
        const _currentServer = this.userService.getServer();
        const currentServer = data.servers.find(s => _currentServer && s.uid == _currentServer.uid);

        console.log(currentServer)

        if (currentServer && +currentServer.active) {
          currentServer.using = true;
          this.userService.saveServer(currentServer);
          this.userService.serverData.next(data.servers);
        } else {
          setTimeout(() => {
            this.nextServer(data.servers);
          }, 1000);
        }
      });

      this.userData = data;
    });
  }

  toggleAdmin() {
    this.showAdmin = !this.showAdmin;
    this.showAccount = false;
  }

  toggleAccount() {
    this.showAccount = !this.showAccount;
    this.showAdmin = false;
  }

  close() {
      this.showAccount = false;
      this.showAdmin = false;
   }
}
