import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
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
  async obtenerDatosAcuerdobyId(id: any): Promise<any> {
    const URL_API = environment.apiUrl + "obtenerDatosAcuerdobyId/" + id;
    try {
      const response = await firstValueFrom(
        this.httpClient.get<any>(URL_API)
      );
      return response;
    } catch (error) {
      console.error('Error al obtener datos del acuerdo:', error);
      throw error;
    }
  }
  public obtenerDatosAcuerdobyId2(id: any) {
    const URL_API = environment.apiUrl + "obtenerDatosAcuerdobyId/" + id;
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }

  public guardarDetalleBeneficio(detalle: FormData) {
    const URL_API = environment.apiUrl + "detalleSeguimientoAcuerdo";
    return this.httpClient.post(URL_API, detalle).pipe(catchError(this.handleError));
  }
  public quitarDetalleBeneficio(detalle: FormData) {
    const URL_API = environment.apiUrl + "quitarDetalleBeneficio";
    return this.httpClient.post(URL_API, detalle).pipe(catchError(this.handleError));
  }
    public quitarDetalleValorAgregado(detalle: FormData) {
    const URL_API = environment.apiUrl + "quitarDetalleValorAgregado";
    return this.httpClient.post(URL_API, detalle).pipe(catchError(this.handleError));
  }
  
  public agregarDetalleAcuerdo(detalle: FormData) {
    const URL_API = environment.apiUrl + "agregarDetalleAcuerdo";
    return this.httpClient.post(URL_API, detalle).pipe(catchError(this.handleError));
  }
    public agregarDetalleAcuerdoVA(detalle: FormData) {
    const URL_API = environment.apiUrl + "agregarDetalleAcuerdoVA";
    return this.httpClient.post(URL_API, detalle).pipe(catchError(this.handleError));
  }
}
