import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamersComponent } from './streamers.component';

describe('StreamersComponent', () => {
  let component: StreamersComponent;
  let fixture: ComponentFixture<StreamersComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StreamersComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StreamersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
