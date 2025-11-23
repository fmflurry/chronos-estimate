import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdoService } from '../../../core/services/ado.service';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { Subject } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, MatAutocompleteModule, MatInputModule, MatFormFieldModule],
  template: `
    <div class="autocomplete">
      <mat-form-field appearance="fill" class="full-width">
        <mat-label>Search Work Items</mat-label>
        <input 
          matInput
          [ngModel]="query()" 
          (ngModelChange)="onSearch($event)" 
          placeholder="Enter title or ID..."
          [matAutocomplete]="auto"
        />
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="select($event.option.value)">
          @for (item of results(); track item.id) {
            <mat-option [value]="item">
              <span class="id">#{{ item.id }}</span>
              <span class="title"> - {{ item.fields['System.Title'] }}</span>
            </mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .autocomplete { width: 100%; max-width: 500px; }
    .full-width { width: 100%; }
    .id { color: var(--nord9); font-weight: bold; margin-right: 0.5rem; }
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

