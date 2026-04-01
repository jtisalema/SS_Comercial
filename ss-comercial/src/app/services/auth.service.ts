import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private httpClient: HttpClient,
    private router: Router
    //private authService: AuthService
  ) { }

  async login(user: any, password: any): Promise<any> {
    const URL_API = environment.apiUrl + "login2";
    try {
      const response = await firstValueFrom(this.httpClient.post<any>(URL_API, {
        usuario: user, password: password
      }));
      return response;
    } catch (error) {
      console.error('Error al obtener la información de ingreso:', error);
      return [];
    }
  }
  setToken(token: any): void {
    localStorage.setItem('Access-Token', token);
  }
  async getUserInfor(): Promise<any> {
    const URL_API = environment.apiUrl + 'userInfor';
    const token = localStorage.getItem('Access-Token');

    if (!token) {
      this.router.navigate(['pagePermission']);
      return null;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    try {
      const responseData = await firstValueFrom(
        this.httpClient.get<any>(URL_API, { headers }).pipe(
          catchError(this.handleError)
        )
      );

      // Ajusta según la estructura real del backend
      return responseData?.data?.user || null;

    } catch (error) {
      console.error('Error al obtener la info del usuario:', error);
      return null;
    }
  }
  getToken() {
    return localStorage.getItem('Access-Token')
  }
  handleError(error: HttpErrorResponse) {
    console.error('HTTP Error:', error);
    return throwError(() => error);
  }
}
