import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from './../environments/environment';

export interface Message {
  author: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class VideoService {

  public currentSegment = new BehaviorSubject({}); 
  private headers: any = new Headers({'Content-Type': 'application/json'});

  constructor(private http: HttpClient) {
    
  }

  public getStream(id) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/video/${id}`, {headers})
  }

  public getSegments(id) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/segments/${id}`, {headers})
  }

  public addSegment(id, start, end) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.post(`${environment.apiUrl}/segment/${id}`, {
      start, end
    }, {headers})
  }

  public saveSegment(id, start=undefined, end=undefined, status=undefined) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.post(`${environment.apiUrl}/segment/edit/${id}`, {
      start, end, status
    }, {headers})
  }

  public deleteSegment(uid) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/segment/delete/${uid}`, {headers})
  }

  public generateArtifact(id) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/video/render/${id}`, {headers})
  }

  public uploadArtifact(id) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/video/upload/${id}`, {headers})
  }

  public warmVideo(id) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/video/warm/${id}`, {headers})
  }

  public coolVideo(id) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/video/cool/${id}`, {headers})
  }

  public setThumbnail(id, thumbnail_time) {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.post(`${environment.apiUrl}/video/edit`, {
      id, thumbnail_time
    }, {headers})
  }

  public getArtifacts() {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem("token") || ""}`,
      'Content-Type': `application/json`
    });

    return this.http.get(`${environment.apiUrl}/artifacts`, {headers})
  }

  public viewSegment(segment) {
    this.currentSegment.next(segment);
  }

}
