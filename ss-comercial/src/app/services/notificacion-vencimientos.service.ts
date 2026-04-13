import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { IRegistroNotificacionesVencimientos, IResponse } from '../models/INotificacionesVencimientos';

@Injectable({
  providedIn: 'root'
})
export class NotificacionVencimientosService {

  constructor(private httpClient: HttpClient) { }

  URL_API = environment.efiApi + "vencimientos-fianzas";
  URL_SS = environment.apiUrl;

  public obtenerAniosVencimientosFianzas() {
    const urlRequest = this.URL_API + "/obtenerAniosVencimientosFianzas";
    return this.httpClient.get<IResponse>(urlRequest).pipe(catchError(this.handleError));
  }

  public obtenerMesesAnioVencimientosFianzas(anio: number) {
    const urlRequest = this.URL_API + "/obtenerMesesAnioVencimientosFianzas/" + anio;
    return this.httpClient.get<IResponse>(urlRequest).pipe(catchError(this.handleError));
  }

  public obtenerVencimientosFianzasAnioMes(anio: number, mes: number) {
    const urlRequest = this.URL_API + "/obtenerVencimientosFianzasAnioMes/" + anio + "/" + mes;
    return this.httpClient.get<IResponse>(urlRequest).pipe(catchError(this.handleError));
  }

  public enviarNotificacionUsuario(registroVencimiento: IRegistroNotificacionesVencimientos) {
    const urlRequest = this.URL_SS + "/postEnviarNotificacionesVencimientos";
    return this.httpClient.post<IResponse>(urlRequest, registroVencimiento).pipe(catchError(this.handleError));
  }

  handleError(error: HttpErrorResponse) {
    console.error('HTTP Error:', error);
    return throwError(() => error);
  }

}
