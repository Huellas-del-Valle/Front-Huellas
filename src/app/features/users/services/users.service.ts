import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateUserStatusDto,
  User,
  UserFilterParams
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene la lista de usuarios/empleados.
   * Endpoint: GET /api/v1/users
   */
  getUsers(filters?: UserFilterParams): Observable<User[]> {
    let params = new HttpParams();

    if (filters) {
      if (filters.search && filters.search.trim().length > 0) {
        params = params.set('search', filters.search.trim());
      }
      if (filters.role && filters.role !== 'ALL') {
        params = params.set('role', filters.role);
      }
      if (filters.status && filters.status !== 'ALL') {
        params = params.set('status', filters.status);
      }
      if (typeof filters.page === 'number') {
        params = params.set('page', filters.page.toString());
      }
      if (typeof filters.limit === 'number') {
        params = params.set('limit', filters.limit.toString());
      }
    }

    return this.http.get<User[]>(`${this.apiUrl}/users`, { params });
  }

  /**
   * Obtiene el detalle de un usuario por su ID.
   * Endpoint: GET /api/v1/users/:id
   */
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${encodeURIComponent(id)}`);
  }

  /**
   * Registra un nuevo empleado con credenciales y rol asignado.
   * Endpoint: POST /api/v1/users
   */
  createUser(dto: CreateUserDto): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, dto);
  }

  /**
   * Actualiza los datos de un empleado existente.
   * Endpoint: PUT /api/v1/users/:id
   */
  updateUser(id: string, dto: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${encodeURIComponent(id)}`, dto);
  }

  /**
   * Activa o inactiva el acceso de un usuario.
   * Endpoint: PATCH /api/v1/users/:id/status
   */
  updateUserStatus(id: string, isActive: boolean): Observable<User> {
    const payload: UpdateUserStatusDto = {
      isActive,
      status: isActive ? 'ACTIVE' : 'INACTIVE'
    };
    return this.http.patch<User>(
      `${this.apiUrl}/users/${encodeURIComponent(id)}/status`,
      payload
    );
  }
}
