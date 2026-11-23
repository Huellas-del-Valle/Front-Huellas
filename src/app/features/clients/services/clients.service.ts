import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Client,
  ClientPetSummary,
  CreateClientDto,
  UpdateClientDto
} from '../models/client.model';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene la lista completa o paginada de clientes.
   * Endpoint: GET /api/v1/clients
   */
  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}/clients`);
  }

  /**
   * Búsqueda reactiva optimizada por documento, nombre o teléfono.
   * Endpoint: GET /api/v1/clients/search?query=...
   */
  searchClients(query: string): Observable<Client[]> {
    const cleanQuery = query ? query.trim() : '';
    let params = new HttpParams();
    if (cleanQuery) {
      params = params.set('query', cleanQuery);
    }
    return this.http.get<Client[]>(`${this.apiUrl}/clients/search`, { params });
  }

  /**
   * Consulta el detalle consolidado de un propietario por su ID.
   * Endpoint: GET /api/v1/clients/:id
   */
  getClientById(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/clients/${encodeURIComponent(id)}`);
  }

  /**
   * Obtiene la lista de mascotas asociadas a un propietario.
   * Endpoint: GET /api/v1/clients/:id/pets
   */
  getClientPets(clientId: string): Observable<ClientPetSummary[]> {
    return this.http.get<ClientPetSummary[]>(
      `${this.apiUrl}/clients/${encodeURIComponent(clientId)}/pets`
    );
  }

  /**
   * Registra un nuevo cliente/propietario con autorización Habeas Data.
   * Endpoint: POST /api/v1/clients
   */
  createClient(dto: CreateClientDto): Observable<Client> {
    return this.http.post<Client>(`${this.apiUrl}/clients`, dto);
  }

  /**
   * Actualiza los datos de un cliente existente.
   * Endpoint: PUT /api/v1/clients/:id
   */
  updateClient(id: string, dto: UpdateClientDto): Observable<Client> {
    return this.http.put<Client>(
      `${this.apiUrl}/clients/${encodeURIComponent(id)}`,
      dto
    );
  }
}
