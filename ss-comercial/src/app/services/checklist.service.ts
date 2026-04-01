import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {

  constructor(private httpClient: HttpClient) { }
  public obtenerGrupoContratane() {
    const URL_API = environment.efiApi + "agentes/gruposContratantes";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public obtenerEjecutivos() {
    const URL_API = environment.apiUrl + "obtenerEjecutivosCheckList";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public obtenerSucursales() {
    const URL_API = environment.efiApi + "sucursales";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public obtenerAseguradoras() {
    const URL_API = environment.efiApi + "aseguradoras";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public obtenerSubareas() {
    const URL_API = environment.efiApi + "subareas";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public obtenerAreas() {
    const URL_API = environment.efiApi + "areas";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public obtenerSubareasxRamo() {
    const URL_API = environment.efiApi + "areas/subarearamo";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public obtenerAgentes() {
    const URL_API = environment.efiApi + "agentes";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public obtenerClientebyCedula(cedula: any) {
    const URL_API = environment.efiApi + "clientes/identificacionCliente/" + cedula;
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public obtenerRamos() {
    const URL_API = environment.efiApi + "ramos";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public obtenerRamosbyArea(id: any) {
    const URL_API = environment.efiApi + "ramos/porCodigoRamoGrupo/" + id;
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  //consulta la informacion de una persona con la cedula(formData, cedula,actualizar,origen)
  public getInfoPersona(inforPersona: FormData) {
    const URL_API = environment.apiUrl + "consulta-ced2";
    return this.httpClient.post(URL_API, inforPersona).pipe(catchError(this.handleError));
  }
  public obtenerRequisitosbySubarea(datos:any) {
    const URL_API = environment.apiUrl + "obtenerRequisitosbySubarea";
    return this.httpClient.post(URL_API,datos).pipe(catchError(this.handleError));
  }
  public obtenerTipoContactobySubarea(id: any) {
    const URL_API = environment.apiUrl + "obtenerTipoContactobySubarea/" + id;
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  handleError(error: HttpErrorResponse) {
    console.error('HTTP Error:', error);
    return throwError(() => error);
  }

  public enviarCheckList(form: any) {
    const URL_API = environment.apiUrl + "ingresarCheckList";
    return this.httpClient.post(URL_API, form).pipe(catchError(this.handleError));
  }
  public obtenerTiempodeEntrega(form: any) {
    const URL_API = environment.apiUrl + "obtenerTiempodeEntrega";
    return this.httpClient.post(URL_API, form).pipe(catchError(this.handleError));
  }

  public actualizarCheckList(form: any) {
    const URL_API = environment.apiUrl + "actualizarCheckList";
    return this.httpClient.post(URL_API, form).pipe(catchError(this.handleError));
  }

  public obtenerIngresosCheckList() {
    const URL_API = environment.apiUrl + "obtenerIngresosCheckList";
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  public cambiarEstadoRevisado(form: any) {
    const URL_API = environment.apiUrl + "cambiarEstadoRevisado";
    return this.httpClient.post(URL_API, form).pipe(catchError(this.handleError));
  }
    public ingresarEntregaEstimada(form: any) {
    const URL_API = environment.apiUrl + "ingresarEntregaEstimada";
    return this.httpClient.post(URL_API, form).pipe(catchError(this.handleError));
  }
  async obtenerDatosIngresobyId(id: any): Promise<any> {
    const URL_API = environment.apiUrl + "obtenerDatosIngresobyId/" + id;

    try {
      const response = await firstValueFrom(
        this.httpClient.get<any>(URL_API)
      );

      return response;
    } catch (error) {
      console.error('Error al obtener datos del ingreso:', error);
      throw error;
    }
  }
  async getFilesRequisitos(idEmision: number) {
    const urlApi = `${environment.apiUrl}getFilesRequisitosCheckList/${idEmision}`;

    // NO usar responseType: 'blob'
    return this.httpClient
      .get<{ data: { name: string; type: string; size: number; url: string; blob: string }[] }>(urlApi)
      .pipe(catchError(this.handleError))
      .toPromise();
  }
  async getFileComprobante(idEmision: number) {
    const urlApi = `${environment.apiUrl}getFilesComprobanteCheckList/${idEmision}`;

    // NO usar responseType: 'blob'
    return this.httpClient
      .get<{ data: { name: string; type: string; size: number; url: string; blob: string }[] }>(urlApi)
      .pipe(catchError(this.handleError))
      .toPromise();
  }
  public accionEjecutivoCheckList(formd: any) {
    const URL_API = environment.apiUrl + "accionEjecutivoCheckList";
    return this.httpClient.post(URL_API, formd).pipe(catchError(this.handleError));
  }

  public obtenerEjecutivoAsignado(formd: any) {
    const URL_API = environment.apiUrl + "obtenerEjecutivoAsignado";
    return this.httpClient.post(URL_API, formd).pipe(catchError(this.handleError));
  }
  
  public obtenerMovimientosRegistro(id: any) {
    const URL_API = environment.apiUrl + "obtenerMovimientosRegistro/" + id;
    return this.httpClient.get(URL_API).pipe(catchError(this.handleError));
  }
  async descargarRequisitosZip(id: any) {
    const URL_API = environment.apiUrl + "descargarRequisitosZip/" + id;
    return this.httpClient.get(URL_API, { responseType: 'blob' }).pipe(catchError(this.handleError));
  }

  async descargarArchivosCheckList(url: string) {

    const urlApi = environment.apiUrl + 'descargarArchivosCheckList';
    const formData = new FormData();
    formData.append('url', url);
    return await this.httpClient.post(urlApi, formData, { responseType: 'blob' }).pipe(catchError(this.handleError)).toPromise();
  }
}
