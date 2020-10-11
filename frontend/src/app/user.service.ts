import { Injectable } from '@angular/core';
import { environment } from './../environments/environment';
import { catchError, retry } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { SocketioService } from './socketio.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private headers: any = new Headers({'Content-Type': 'application/json'});
  public userData = new BehaviorSubject<any>({ignore: true});
  public serverData = new BehaviorSubject<any>({ignore: true});

  constructor(private http: HttpClient, private socketioService: SocketioService) { }

  public login(username, password) {
    return this.http.post(`${environment.apiUrl}/login`, {
      username, password
    }, { 
      headers: this.headers,
      withCredentials: true
    });
  }

  public getUsers() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/users`, { 
      headers
    });
  }

  public getServers() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/servers`, { 
      headers
    });
  }

  public updateUser(data) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.post(`${environment.apiUrl}/user/edit`, data, { 
      headers
    });
  }

  public getData() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/twitch_login`, { 
      headers
    });
  }

  public getServer() {
    try {
      return JSON.parse(localStorage.getItem("server"));
    } catch {
      return {};
    }
  }

  public getToken() {
    return localStorage.getItem("token");
  }

  public updateData() {
    console.log("Data update", localStorage.getItem("token"));
    if (!localStorage.getItem("token")) {
      this.userData.next({success: false});
    }
    console.log("Why");
    this.getData().subscribe((data: any) => {
      console.log("DATAA", data);
      this.userData.next(data);
    });
  }

  public saveToken(token) {
    localStorage.setItem("token", token);
    this.updateData();
  }

  public saveServer(server) {
    if (server) {
      environment.apiUrl = `${server.address}/api/v1`;
      environment.websocket = server.address;

      this.socketioService.destroySocketConnection();
      this.socketioService.setupSocketConnection();

      localStorage.setItem("server", JSON.stringify(server));
    }
  }
}
