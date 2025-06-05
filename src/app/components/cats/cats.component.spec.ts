/* eslint-disable @typescript-eslint/no-unused-vars */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatsComponent } from './cats.component';
import { Effect, makeStore } from 'app/core/framework';
import { catReducer, initCatState } from 'app/reducers/cats';

describe('CatsComponent', () => {
  let component: CatsComponent;
  let fixture: ComponentFixture<CatsComponent>;

  beforeEach(async () => {
    const mockStore = makeStore(
      initCatState,
      {
        httpFetch: (url, headers) =>
          new Effect((cb) => {
            /* no-op */
          }),
      },
      catReducer,
    );
    await TestBed.configureTestingModule({
      imports: [CatsComponent],
      providers: [],
    }).compileComponents();

    fixture = TestBed.createComponent(CatsComponent);
    component = fixture.componentInstance;
    component.store = mockStore;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
