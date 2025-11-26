import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdoService } from '../../../core/services/ado.service';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { Subject } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, MatAutocompleteModule, MatInputModule, MatFormFieldModule, MatIconModule],
  template: `
    <div class="autocomplete-container">
      <mat-form-field appearance="outline" class="work-item-search">
        <mat-label>Search Work Items</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input 
          matInput
          [ngModel]="query()" 
          (ngModelChange)="onSearch($event)" 
          placeholder="Type work item ID or title..."
          [matAutocomplete]="auto"
        />
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="select($event.option.value)">
          @for (item of results(); track item.id) {
            <mat-option [value]="item">
              <div class="work-item-content">
                <span class="work-item-id">#{{ item.id }}</span>
                <span class="work-item-title">{{ item.fields['System.Title'] }}</span>
              </div>
            </mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .autocomplete-container {
      width: 100%;
    }
    
    .work-item-search {
      width: 100%;
      font-size: 1.125rem;
    }

    .work-item-search ::ng-deep .mat-mdc-text-field-wrapper {
      background-color: transparent;
    }

    .work-item-search ::ng-deep .mat-mdc-form-field-focus-overlay {
      background-color: transparent;
    }

    .work-item-search ::ng-deep input {
      font-size: 1.125rem;
      color: var(--nord6);
    }

    .work-item-search ::ng-deep .mat-mdc-form-field-icon-prefix {
      color: var(--nord9);
      padding-right: 0.75rem;
    }

    .work-item-search ::ng-deep .mat-mdc-form-field-icon-prefix > mat-icon {
      padding: 0;
    }

    .work-item-search ::ng-deep .mdc-notched-outline__leading,
    .work-item-search ::ng-deep .mdc-notched-outline__notch,
    .work-item-search ::ng-deep .mdc-notched-outline__trailing {
      border-color: var(--nord3);
    }

    .work-item-search ::ng-deep .mat-mdc-form-field:hover .mdc-notched-outline__leading,
    .work-item-search ::ng-deep .mat-mdc-form-field:hover .mdc-notched-outline__notch,
    .work-item-search ::ng-deep .mat-mdc-form-field:hover .mdc-notched-outline__trailing {
      border-color: var(--nord8);
    }

    .work-item-search ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    .work-item-search ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    .work-item-search ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: var(--nord8);
      border-width: 2px;
    }

    .work-item-search ::ng-deep .mat-mdc-form-field-infix {
      min-height: 56px;
      padding-top: 16px;
      padding-bottom: 16px;
    }

    .work-item-content {
      display: flex;
      align-items: center;
      gap: 1rem;
      width: 100%;
      padding: 0.25rem 0;
    }

    .work-item-id {
      color: var(--nord9);
      font-weight: 600;
      font-size: 1rem;
      min-width: 90px;
      flex-shrink: 0;
    }

    .work-item-title {
      color: var(--nord6);
      font-size: 1rem;
      line-height: 1.5;
      flex: 1;
    }

    ::ng-deep .mat-mdc-autocomplete-panel {
      background: var(--nord0);
      border: 1px solid var(--nord3);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }

    ::ng-deep .mat-mdc-option {
      min-height: 56px;
    }

    ::ng-deep .mat-mdc-option:hover {
      background-color: var(--nord1) !important;
    }

    ::ng-deep .mat-mdc-option.mat-mdc-option-active {
      background-color: var(--nord1) !important;
    }
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

