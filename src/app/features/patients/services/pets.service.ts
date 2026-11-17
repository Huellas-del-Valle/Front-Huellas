import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreatePetDto, Pet, PetOwnerSummary } from '../models/pet.model';

@Injectable({
  providedIn: 'root'
})
export class PetsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  createPet(dto: CreatePetDto): Observable<Pet> {
    return this.http.post<Pet>(`${this.apiUrl}/pets`, dto);
  }

  getPetById(id: string): Observable<Pet> {
    return this.http.get<Pet>(`${this.apiUrl}/pets/${encodeURIComponent(id)}`);
  }

  getPetsByClient(clientId: string): Observable<Pet[]> {
    return this.http.get<Pet[]>(`${this.apiUrl}/clients/${encodeURIComponent(clientId)}/pets`);
  }

  getAllPets(search?: string): Observable<Pet[]> {
    let params = new HttpParams();
    if (search && search.trim().length > 0) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Pet[]>(`${this.apiUrl}/pets`, { params });
  }

  searchOwners(query: string): Observable<PetOwnerSummary[]> {
    const params = new HttpParams().set('query', query.trim());
    return this.http.get<PetOwnerSummary[]>(`${this.apiUrl}/clients/search`, { params });
  }
}
