import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../user.service'

@Component({
  selector: 'app-logout',
  templateUrl: './logout.component.html',
  styleUrls: ['./logout.component.css']
})
export class LogoutComponent implements OnInit {

  constructor(private userService: UserService, private router: Router) { }

  ngOnInit() {
    console.log("Logout?")
    this.userService.saveToken("");
    this.router.navigateByUrl('/login');
  }

}
