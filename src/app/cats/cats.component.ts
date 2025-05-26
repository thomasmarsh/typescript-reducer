import { Component, Input, OnInit, TrackByFunction } from '@angular/core';
import { CatAction, CatState } from '../core/cats';
import { Store } from '../core/framework';
import { NgIf, NgSwitch, NgSwitchCase, NgFor } from '@angular/common';
import { count } from 'rxjs';

@Component({
  selector: 'app-cats',
  imports: [NgIf, NgSwitch, NgSwitchCase, NgFor],
  templateUrl: './cats.component.html',
  styleUrl: './cats.component.css',
})
export class CatsComponent implements OnInit {
  @Input() store!: Store<CatState, CatAction>;

  value: CatState = { tag: 'Loading', count: 0 };
  trackByIndex!: TrackByFunction<string>;

  ngOnInit(): void {
    this.store.subscribe((v) => {
      console.log(v);
      this.value = v;
    });
  }
}
