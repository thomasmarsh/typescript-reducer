import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CounterComponent } from './counter.component';
import { Effect, makeStore } from 'app/core/framework';
import { counterReducer } from 'app/reducers/counter';

describe('CounterComponent', () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<CounterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent],
    }).compileComponents();

    const mockStore = makeStore(
      0,
      { announce: Effect.empty() },
      counterReducer,
    );

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    component.store = mockStore;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
