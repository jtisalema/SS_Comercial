import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class comunicadosService {

  constructor(private httpClient: HttpClient
    //private authService: AuthService
  ) { }

  async obtenerComunicados(): Promise<any[]> {
    const URL_API = environment.apiUrl + "getVentasComunicados";
    try {
      const response = await firstValueFrom(this.httpClient.get<any>(URL_API));
      return response['data'] || [];
    } catch (error) {
      console.error('Error al obtener los comunicados:', error);
      return [];
    }
  }
}
