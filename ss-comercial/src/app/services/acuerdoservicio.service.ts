import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AcuerdoservicioService {

  constructor(private httpClient: HttpClient) { }
  public generarAcuerdoServicio(infoIngreso: FormData) {
    const URL_API = environment.apiUrl + "generarAcuerdoServicio";
    return this.httpClient.post(URL_API, infoIngreso).pipe(catchError(this.handleError));
  }
  public completarAcuerdoServicio(infoIngreso: FormData) {
    const URL_API = environment.apiUrl + "completarAcuerdoServicio";
    return this.httpClient.post(URL_API, infoIngreso).pipe(catchError(this.handleError));
  }
  public obtenerContactosIniciales() {
    const URL_API = environment.apiUrl + "acuerdoContactoInicial";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
    public obtenerAcuerdosServicio() {
    const URL_API = environment.apiUrl + "obtenerAcuerdosServicio";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
    handleError(error: HttpErrorResponse) {
    console.error('HTTP Error:', error);
    return throwError(() => error);
  }
}
