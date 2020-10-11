import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TwitchOauthComponent } from './twitch-oauth.component';

describe('TwitchOauthComponent', () => {
  let component: TwitchOauthComponent;
  let fixture: ComponentFixture<TwitchOauthComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TwitchOauthComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TwitchOauthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
