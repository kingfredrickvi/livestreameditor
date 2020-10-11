import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from './../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VideosService {

  constructor(private http: HttpClient) { }

  public getStreams(uid="") {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || "asdf"}`,
      'Content-Type': `application/json`
    });

    let query = "";

    if (uid) {
      query = `?video=${uid}`;
    }

    return this.http.get(`${environment.apiUrl}/videos${query}`, {headers});
  }

}


// https://id.twitch.tv/oauth2/authorize?client_id=gaswwprjlctyjd4tgvrc49kq6pj6zy&redirect_uri=http://127.0.0.1:4200/twitch_oauth&response_type=token
