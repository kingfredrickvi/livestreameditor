import { Component, OnInit } from '@angular/core';
import { VideoService } from '../video.service'
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-artifacts',
  templateUrl: './artifacts.component.html',
  styleUrls: ['./artifacts.component.css']
})
export class ArtifactsComponent implements OnInit {

  public artifacts = [];
  public staticUrl = environment.staticUrl;

  constructor(private videoService: VideoService) { }

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.videoService.getArtifacts().subscribe((data: any) => {
      this.artifacts = data.artifacts.sort(function(a, b) {
        return b.added - a.added;
      });
    });
  }

  upload(artifact) {
    if (confirm("Are you sure you would like to upload this artifact?")) {
      this.videoService.uploadArtifact(artifact.uid).subscribe((data: any) => {
        console.log(data);
      });
    }
  }

}

// https://static-cdn.jtvnw.net/jtv_user_pictures/761b7fd6-bf2f-460b-bc83-9ea6466cdbaf-profile_image-70x70.png
