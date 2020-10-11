import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MultistreamComponent } from './multistream.component';

describe('MultistreamComponent', () => {
  let component: MultistreamComponent;
  let fixture: ComponentFixture<MultistreamComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MultistreamComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MultistreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
