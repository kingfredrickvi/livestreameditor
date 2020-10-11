import { TestBed } from '@angular/core/testing';

import { StreamersService } from './streamers.service';

describe('StreamersService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: StreamersService = TestBed.get(StreamersService);
    expect(service).toBeTruthy();
  });
});
