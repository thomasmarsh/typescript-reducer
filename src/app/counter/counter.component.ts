import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CounterAction } from '../core/counter';
import { Store } from '../core/framework';

@Component({
  selector: 'app-counter',
  imports: [],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.css',
})
export class CounterComponent implements OnInit, OnDestroy {
  @Input() store!: Store<number, CounterAction>;

  value = 0;
  unsubscribe!: () => void;

  ngOnInit(): void {
    this.unsubscribe = this.store.subscribe((v) => (this.value = v));
  }

  ngOnDestroy(): void {
    this.unsubscribe();
  }
}
