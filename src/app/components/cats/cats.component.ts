import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CatAction, CatState, initCatState } from '../../reducers/cats';
import { Store } from '../../core/framework';
import { NgIf, NgSwitch, NgSwitchCase } from '@angular/common';
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
export class CatsComponent implements OnInit, OnDestroy {
  @Input() store!: Store<CatState, CatAction>;

  state: CatState = initCatState;
  unubscribe!: () => void;

  ngOnInit(): void {
    this.unubscribe = this.store.subscribe((v) => {
      if (v != this.state) {
        this.state = v;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.unubscribe) {
      this.unubscribe();
    }
  }
}
