import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from './../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StreamersService {
  private headers: any = new Headers({'Content-Type': 'application/json'});

  constructor(private http: HttpClient) { }

  public getStreamers() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/streamers`, {headers});
  }

  public getStreamerGroups() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/streamer_groups`, {headers});
  }

  public updateStreamer(data) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.post(`${environment.apiUrl}/streamer/edit`, data, { 
      headers
    });
  }

  public addStreamer(data) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.post(`${environment.apiUrl}/streamer/add`, data, {headers});
  }
}
