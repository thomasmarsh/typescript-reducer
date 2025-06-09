import { Component, Input } from '@angular/core';
import { Store } from 'app/core/framework';
import { AppHistory } from 'app/reducers/app';
import { NgxJsonTreeviewComponent } from 'ngx-json-treeview';

@Component({
  selector: 'app-history',
  imports: [NgxJsonTreeviewComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css',
})
export class HistoryComponent {
  @Input() store!: Store<AppHistory, never>;

  value!: AppHistory;

  unsubscribe!: () => void;

  ngOnInit(): void {
    this.unsubscribe = this.store.subscribe((v) => (this.value = v));
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
