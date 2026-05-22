import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PygService {

  constructor(private httpClient: HttpClient) { }
  public consultarClienteNombre(nombre: string) {
    const URL_API = "https://siniestros.segurossuarez.com:3030/api/Clientes/" + nombre;
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public consultarClienteNombreCompleto(nombre: string) {
    const URL_API = "https://cotizador.segurossuarez.com/efi-api/clientes/informacionCliente/" + nombre;
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  handleError(error: HttpErrorResponse) {
    console.error('HTTP Error:', error);
    return throwError(() => error);
  }
  public guardarPYG(form: any) {
    const URL_API = environment.apiUrl + "guardarPYG";
    return this.httpClient.post(URL_API, form).pipe(catchError(this.handleError));
  }
    public obtenerRegistrosPYG() {
    const URL_API = environment.apiUrl + "obtenerRegistrosPYG";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
      public obtenerRegistrosPYGbyID(idRegistro:string) {
    const URL_API = environment.apiUrl + "obtenerRegistrosPYGbyID/"+idRegistro;
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
}
