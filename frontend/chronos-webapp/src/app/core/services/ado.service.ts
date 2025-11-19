import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AdoService {
  http = inject(HttpClient);
  apiUrl = 'http://localhost:3333/api/ado';

  search(query: string) {
    return this.http.get<any[]>(`${this.apiUrl}/search`, { 
      params: { query },
      withCredentials: true 
    });
  }
}

