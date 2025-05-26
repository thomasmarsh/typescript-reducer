import { Component, Input, OnInit } from '@angular/core';
import { CounterAction } from '../core/counter';
import { Store } from '../core/framework';

@Component({
  selector: 'app-counter',
  imports: [],
  templateUrl: './counter.component.html',
  styleUrl: './counter.component.css',
})
export class CounterComponent implements OnInit {
  @Input() store!: Store<number, CounterAction>;

  value = 0;

  ngOnInit(): void {
    this.store.subscribe((v) => (this.value = v));
  }

  increment() {
    this.store.send('increment');
  }

  decrement() {
    this.store.send('decrement');
  }

  reset() {
    this.store.send('reset');
  }
}
