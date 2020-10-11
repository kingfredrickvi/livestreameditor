import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../user.service'

@Component({
  selector: 'app-twitch-oauth',
  templateUrl: './twitch-oauth.component.html',
  styleUrls: ['./twitch-oauth.component.css']
})
export class TwitchOauthComponent implements OnInit {

  constructor(private route: ActivatedRoute, private router: Router, private userService: UserService) {

  }

  ngOnInit() {
    const hash = document.location.hash;
    let token = undefined;

    if (hash) {
      hash.split("&").forEach((v) => {
        const hs = v.split("=");
        if (hs[0] == "access_token" || hs[0] == "#access_token") {
          token = hs[1];
        }
      });
    }

    if (token) {
      this.userService.saveToken(token);
      return this.router.navigateByUrl('/');
    } else {
      return this.router.navigateByUrl('/login');
    }
  }

}
