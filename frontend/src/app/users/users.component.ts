import { Component, OnInit } from '@angular/core';
import { UserService } from '../user.service'
import { StreamersService } from '../streamers.service'

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {

  constructor(private userService: UserService, private streamersService: StreamersService) { }

  public users = [];
  public streamerGroups = [];

  ngOnInit() {
    this.userService.getUsers().subscribe((data: any) => {
      data.users.map(u => {
        u.streamer_groups = JSON.parse(u.streamer_groups);
      });
      this.users = data.users;
      console.log(this.users);
    });
    this.streamersService.getStreamerGroups().subscribe((data: any) => {
      this.streamerGroups = data.streamer_groups;
    });
  }

  updateGroup(user, newGroup) {
    this.userService.updateUser({id: user.uid, group: newGroup}).subscribe((data: any) => {
      console.log(data);
    });
  }

  updateStreamerGroup(user, newGroups) {
    this.userService.updateUser({id: user.uid, streamer_groups: user.streamer_groups}).subscribe((data: any) => {
      console.log(data);
    });
  }
}
