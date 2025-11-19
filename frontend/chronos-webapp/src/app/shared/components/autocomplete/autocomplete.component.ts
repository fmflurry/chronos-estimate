import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdoService } from '../../../core/services/ado.service';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="autocomplete">
      <input 
        [ngModel]="query()" 
        (ngModelChange)="onSearch($event)" 
        placeholder="Search Work Items..." 
        class="search-input"
      />
      @if (results().length > 0) {
        <ul class="results-list">
          @for (item of results(); track item.id) {
            <li (click)="select(item)">
              <span class="id">#{{ item.id }}</span>
              <span class="title">{{ item.fields['System.Title'] }}</span>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .autocomplete { position: relative; width: 100%; max-width: 500px; }
    .search-input { width: 100%; padding: 0.75rem; border: 1px solid var(--nord3); background: var(--nord0); color: var(--nord4); border-radius: 4px; }
    .results-list {
      position: absolute; top: 100%; left: 0; right: 0;
      background: var(--nord1); border: 1px solid var(--nord3);
      list-style: none; padding: 0; margin: 0; z-index: 10;
      max-height: 200px; overflow-y: auto;
    }
    .results-list li {
      padding: 0.5rem; cursor: pointer; display: flex; gap: 0.5rem;
      &:hover { background: var(--nord2); }
    }
    .id { color: var(--nord9); font-weight: bold; }
  `]
})
export class AutocompleteComponent {
  adoService = inject(AdoService);
  @Output() selected = new EventEmitter<any>();
  
  query = signal('');
  results = signal<any[]>([]);
  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || term.length < 3) return of([]);
        return this.adoService.search(term).pipe(catchError(() => of([])));
      })
    ).subscribe(items => this.results.set(items));
  }

  onSearch(term: string) {
    this.query.set(term);
    this.searchSubject.next(term);
  }

  select(item: any) {
    this.selected.emit(item);
    this.query.set('');
    this.results.set([]);
  }
}

