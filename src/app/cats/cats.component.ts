import { Component, Input, OnInit, TrackByFunction } from '@angular/core';
import { CatAction, CatState, initCatState } from '../core/cats';
import { Store } from '../core/framework';
import { NgIf, NgSwitch, NgSwitchCase, NgFor } from '@angular/common';
import { GalleriaModule } from 'primeng/galleria';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-cats',
  imports: [
    NgIf,
    NgSwitch,
    NgSwitchCase,
    GalleriaModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './cats.component.html',
  styleUrl: './cats.component.css',
})
export class CatsComponent implements OnInit {
  @Input() store!: Store<CatState, CatAction>;

  state: CatState = initCatState;

  ngOnInit(): void {
    this.store.subscribe((v) => {
      if (v != this.state) {
        this.state = v;
      }
    });
  }
}
