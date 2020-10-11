import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { HomeComponent } from './home/home.component'
import { StreamComponent } from './stream/stream.component'
import { MultistreamComponent } from './multistream/multistream.component'
import { StreamsComponent } from './streams/streams.component'
import { SettingsComponent } from './settings/settings.component'
import { LoginComponent } from './login/login.component'
import { LogoutComponent } from './logout/logout.component'
import { StreamersComponent } from './streamers/streamers.component'
import { UsersComponent } from './users/users.component'
import { ArtifactsComponent } from './artifacts/artifacts.component'
import { TwitchOauthComponent } from './twitch-oauth/twitch-oauth.component'

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LogoutComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'streamers', component: StreamersComponent },
  { path: 'users', component: UsersComponent },
  { path: 'artifacts', component: ArtifactsComponent },
  { path: 'twitch_oauth', component: TwitchOauthComponent },
  { path: 'twitch_oauth', component: TwitchOauthComponent },
  { path: 'stream/:id', component: StreamComponent },
  { path: 'multistream/:id', component: MultistreamComponent },
  { path: 'streams', component: StreamsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
