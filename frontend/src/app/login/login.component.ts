import { Component, OnInit, Input } from '@angular/core';
import { UserService } from '../user.service'
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  private username = "";
  private password = "";
  private error = "";
  private loginSub;

  constructor(private userService: UserService, private router: Router) { }

  ngOnInit() {
    this.loginSub = this.userService.userData.subscribe((data: any) => {
      console.log("DATA", data);
      if (data.ignore) return;

      if (data.success) {
        this.router.navigateByUrl('/');
      }
    });
  }

  ngOnDestroy() {
    this.loginSub.unsubscribe();
  }

  doLogin() {
    window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${environment.client_id}&redirect_uri=${environment.redirect_domain}/twitch_oauth&response_type=token&scope=user:read:email`;
  }

  formSubmit() {
    if (this.username.length == 0 || this.password.length == 0) {
      return;
    }

    console.log(this.username, this.password);

    this.userService.login(this.username, this.password).subscribe((data: any) => {
      console.log(data);

      if (data.success) {
        this.router.navigateByUrl('/');
      } else {
        this.error = data.error;
      }
    }, error => {
      this.error = error;
    })
  }

}
