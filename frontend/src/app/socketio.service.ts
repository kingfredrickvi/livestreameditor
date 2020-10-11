import { Injectable } from '@angular/core';
import * as io from 'socket.io-client';
import { environment } from './../environments/environment';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketioService {
  
  private socket;
  public newSegments; 
  public deleteSegments; 
  public videos; 

  constructor() {
    this.newSegments = new Subject();
    this.deleteSegments = new Subject();
    this.videos = new Subject();
  }

  destroySocketConnection() {
    this.socket.off('segment');
    this.socket.off('segment_delete');
    this.socket.off('video');
    this.socket.disconnect();
  }

  setupSocketConnection() {
    this.socket = io(environment.websocket);
    this.socket.on('segment', (data: string) => {
      console.log("segment add", data);
      this.newSegments.next(data);
    });
    this.socket.on('segment_delete', (data: string) => {
      console.log("segment add", data);
      this.deleteSegments.next(data);
    });
    this.socket.on('video', (data: string) => {
      console.log("video update", data);
      this.videos.next(data);
    });
  }
}
