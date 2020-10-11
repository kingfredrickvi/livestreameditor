import { BrowserModule } from '@angular/platform-browser';
import { NgModule, Pipe, PipeTransform } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {VgCoreModule} from 'videogular2/compiled/core';
import {VgControlsModule} from 'videogular2/compiled/controls';
import {VgOverlayPlayModule} from 'videogular2/compiled/overlay-play';
import {VgBufferingModule} from 'videogular2/compiled/buffering';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { StreamsComponent } from './streams/streams.component';
import { StreamComponent } from './stream/stream.component';
import { EditComponent } from './edit/edit.component';
import { SettingsComponent } from './settings/settings.component';
import { AdminComponent } from './admin/admin.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HttpClientModule } from '@angular/common/http';
import { SegmentsComponent } from './segments/segments.component';
import { LoginComponent } from './login/login.component';
import { TwitchOauthComponent } from './twitch-oauth/twitch-oauth.component';
import { LogoutComponent } from './logout/logout.component';
import { SocketioService } from './socketio.service';
import { StreamersComponent } from './streamers/streamers.component';
import { UsersComponent } from './users/users.component';
import { ArtifactsComponent } from './artifacts/artifacts.component';
import { MultistreamComponent } from './multistream/multistream.component'

@Pipe({name: 'floor'})
export class FloorPipe implements PipeTransform {
    transform(value: number): number {
        return Math.floor(value);
    }
}
@Pipe({
  name: 'minuteSeconds'
})
export class MinuteSecondsPipe implements PipeTransform {
  transform(value: number): string {
    const hours: number = Math.floor(value / 60 / 60);
    const minutes: number = Math.floor(value / 60) % 60;
    const seconds: number = Math.floor(value) % 60;

    const hoursTime = hours > 0 ? hours.toString().padStart(2, '0') + ':' : "";

    return hoursTime + 
        minutes.toString().padStart(2, '0') + ':' + 
        (seconds).toString().padStart(2, '0');
  }
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    StreamsComponent,
    StreamComponent,
    EditComponent,
    SettingsComponent,
    AdminComponent,
    DashboardComponent,
    SegmentsComponent,
    LoginComponent,
    TwitchOauthComponent,
    LogoutComponent,
    StreamersComponent,
    UsersComponent,
    ArtifactsComponent,
    FloorPipe,
    MinuteSecondsPipe,
    MultistreamComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    VgCoreModule,
    VgControlsModule,
    VgOverlayPlayModule,
    VgBufferingModule,
    FormsModule
  ],
  providers: [SocketioService],
  bootstrap: [AppComponent]
})
export class AppModule { }
