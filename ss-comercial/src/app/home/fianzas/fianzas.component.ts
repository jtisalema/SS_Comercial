import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { IMesesVencimientos, INotificacionesVencimientos, IRegistroNotificacionesVencimientos, IResponse } from 'src/app/models/INotificacionesVencimientos';
import { LoadingService } from 'src/app/services/loading.service';
import { NotificacionVencimientosService } from 'src/app/services/notificacion-vencimientos.service';
import { ToastrService } from 'src/app/services/toastr.service';
import * as SpanishLanguage from 'src/assets/Spanish.json';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
declare var $: any;

@Component({
  selector: 'app-fianzas',
  templateUrl: './fianzas.component.html',
  styleUrls: ['./fianzas.component.css']
})
export class FianzasComponent {

  //#region Declaración de variables
  lstAniosVencimientos: number[] = [];
  lstMesesAnioVencimientos: IMesesVencimientos[] = [];
  lstVencimientos: INotificacionesVencimientos[] = [];
  //DataTables
  @ViewChild('dataTableVencimientos', { static: false }) tableVencimientos!: ElementRef;
  dtOptions: any;
  dataTable: any;
  //Filtros
  anioSeleccionadoVencimiento: number | null = null;
  mesSeleccionadoVencimiento: number | null = null;
  lstSeleccionadosVencimientos: any[] = [];
  //#endregion  

  constructor(private notificacionVencimientosService: NotificacionVencimientosService,
    private toastrService: ToastrService,
    private loadingService: LoadingService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.obtenerAniosVencimientos();
    this.obtenerListadoVencimientos();
  }

  obtenerAniosVencimientos() {
    this.loadingService.showLoading();
    try {
      this.notificacionVencimientosService.obtenerAniosVencimientosFianzas().subscribe({
        next: (response) => {
          if (response.esError) {
            this.toastrService.warning('Años de vencimientos', response.mensaje ?? "No se pudieron obtener los años de vencimientos");
            return;
          }
          this.lstAniosVencimientos = response.resultado as number[] ?? [];
        },
        error: (error) => {
          this.toastrService.error('Obtener información', 'Error al obtener los años de vencimientos');
        }
      });
    } catch (error) {
      this.toastrService.error('Obtener información', 'Error al obtener los años de vencimientos');
    } finally {
      this.loadingService.hideLoading();
    }
  }

  obtenerListadoVencimientos() {
    this.loadingService.showLoading();
    try {
      const fecha = new Date();
      const anio = fecha.getFullYear();
      const mes = fecha.getMonth() + 1;
      this.notificacionVencimientosService.obtenerVencimientosFianzasAnioMes(anio, mes).subscribe({
        next: (response) => {
          if (response.esError) {
            this.toastrService.warning('Notificaciones de Vencimientos', response.mensaje ?? "No se pudo obtener información de vencimientos");
            return;
          }
          this.lstVencimientos = response.resultado as INotificacionesVencimientos[] ?? [];
          this.cargarTablas();
        },
        error: (error) => {
          this.toastrService.error('Obtener información', 'Error al obtener los años de vencimientos');
        }
      });
    } catch (error) {
      this.toastrService.error('Obtener información', 'Error al obtener los años de vencimientos');
    } finally {
      this.loadingService.hideLoading();
    }
  }

  onChangeAnioVencimiento() {
    this.loadingService.showLoading();
    try {
      this.mesSeleccionadoVencimiento = null;
      if (!this.anioSeleccionadoVencimiento) {
        this.lstMesesAnioVencimientos = [];
        return;
      }
      this.notificacionVencimientosService.obtenerMesesAnioVencimientosFianzas(this.anioSeleccionadoVencimiento).subscribe({
        next: (response) => {
          if (response.esError) {
            this.toastrService.warning('Meses de Vencimientos', response.mensaje ?? "No se pudo obtener información de meses para el año seleccionado");
            return;
          }
          this.lstMesesAnioVencimientos = response.resultado as IMesesVencimientos[] ?? [];
          this.cargarTablas();
        },
        error: (error) => {
          this.toastrService.error('Obtener información', 'Error al obtener los meses de vencimientos');
        }
      });

    } catch (error) {
      this.toastrService.error('Obtener información', 'Error al obtener meses de vencimientos');
    } finally {
      this.loadingService.hideLoading();
    }

  }

  consultarVencimientos() {
    this.loadingService.showLoading();
    if (!this.anioSeleccionadoVencimiento) {
      this.toastrService.warning('Año de Vencimientos', 'Por favor, seleccione un año para consultar los vencimientos');
      return;
    }
    if (!this.mesSeleccionadoVencimiento) {
      this.toastrService.warning('Mes de Vencimientos', 'Por favor, seleccione un mes para consultar los vencimientos');
      return;
    }
    try {
      this.notificacionVencimientosService.obtenerVencimientosFianzasAnioMes(this.anioSeleccionadoVencimiento, this.mesSeleccionadoVencimiento).subscribe({
        next: (response) => {
          if (response.esError) {
            this.toastrService.warning('Notificaciones de Vencimientos', response.mensaje ?? "No se pudo obtener información de vencimientos");
            return;
          }
          this.lstVencimientos = response.resultado as INotificacionesVencimientos[] ?? [];
          this.cargarTablas();
        },
        error: (error) => {
          this.toastrService.error('Obtener información', 'Error al obtener los vencimientos');
        }
      });
    } catch (error) {
      this.toastrService.error('Obtener información', 'Error al obtener los vencimientos');
    } finally {
      this.loadingService.hideLoading();
    }
  }

  limpiarFiltrosVencimientos() {
    this.anioSeleccionadoVencimiento = null;
    this.mesSeleccionadoVencimiento = null;
    this.lstMesesAnioVencimientos = [];
    this.lstVencimientos = [];
    this.obtenerListadoVencimientos();
  }

  cargarTablas() {
    this.dtOptions = {
      data: this.lstVencimientos,
      info: false,
      autoWidth: false,
      responsive: false,
      language: {
        ...this.GetSpanishLanguage()
      },
      columns: [
        {
          title: '',
          data: null,
          orderable: false,
          className: 'text-center align-middle col-check',
          render: (data: any, type: any, row: any) => {
            return `<input type="checkbox" class="check-vencimiento" value="${row.id ?? row.poliza}"/>`;
          }
        },
        {
          title: '<i class="fas fa-shield-alt mr-1 text-success"></i> Ramo',
          data: 'nmRamo',
          className: 'align-middle col-ramo'
        },
        {
          title: '<i class="fas fa-building mr-1 text-secondary"></i> Aseguradora',
          data: 'nmAseg',
          className: 'align-middle col-aseguradora'
        },
        {
          title: '<i class="fas fa-file-contract mr-1 text-warning"></i> Póliza',
          data: 'poliza',
          className: 'text-center align-middle col-poliza'
        },
        {
          title: '<i class="fas fa-calendar-alt mr-1 text-primary"></i> Fc. Inicio',
          data: null,
          className: 'text-center align-middle col-fecha',
          render: (data: any, type: any, row: any) => {
            const inicio = row.fcDesde ? row.fcDesde.split('T')[0] : '';
            if (!inicio) return '';
            return inicio;
          }
        },
        {
          title: '<i class="fas fa-calendar-alt mr-1 text-primary"></i> Fc. Fin',
          data: null,
          className: 'text-center align-middle col-fecha',
          render: (data: any, type: any, row: any) => {
            const fin = row.fcHasta ? row.fcHasta.split('T')[0] : '';
            if (!fin) return '';
            return fin;
          }
        },
        {
          title: '<i class="fas fa-user-tie mr-1 text-dark"></i> Cliente',
          data: 'cliente',
          className: 'align-middle col-cliente'
        },
        {
          title: '<i class="fas fa-align-left mr-1 text-info"></i> Objeto',
          data: 'dscObjeto',
          className: 'align-middle col-objeto',
          render: (data: any) => {
            return data ? `<div class="objeto-justify">${data}</div>` : '';
          }
        },
        {
          title: '<i class="fas fa-dollar-sign mr-1 text-success"></i> Valor Asegurado',
          data: 'totValAseg',
          className: 'text-right align-middle col-money',
          render: (data: number) => this.formatoDinero(data, true)
        },
        {
          title: '<i class="fas fa-coins mr-1 text-warning"></i> Tot. Prima',
          data: 'totPrima',
          className: 'text-right align-middle col-money',
          render: (data: number) => this.formatoDinero(data, true)
        },
        {
          title: '<i class="fas fa-envelope mr-1 text-primary"></i> Correo',
          data: 'correo',
          className: 'align-middle col-correo',
          render: (data: any) => {
            return data ? `<a href="mailto:${data}" class="text-decoration-none">${data}</a>` : '';
          }
        },
        {
          title: '<i class="fas fa-phone-alt mr-1 text-success"></i> Teléfono',
          data: 'telefonos',
          className: 'text-center align-middle col-telefono'
        }
      ],
      scrollY: '75vh',
      scrollX: true,
      pagingType: 'full_numbers',
      pageLength: 10,
      processing: true,
      destroy: true,
      createdRow: (row: Node) => {
        $('td', row).eq(9).addClass('prima-highlight');
      }
    };

    if ($.fn.DataTable.isDataTable(this.tableVencimientos.nativeElement)) {
      $(this.tableVencimientos.nativeElement).DataTable().destroy();
    }

    this.dataTable = $(this.tableVencimientos.nativeElement).DataTable(this.dtOptions);

    this.cdr.detectChanges();

    this.dataTable = $(this.tableVencimientos.nativeElement).DataTable(this.dtOptions);

    setTimeout(() => {
      const table = $(this.tableVencimientos.nativeElement).DataTable();
      [3, 4, 5].forEach(i => {
        $(table.column(i).header()).css({
          'min-width': '75px',
          'width': '75px',
          'max-width': '75px'
        });
        table.column(i).nodes().to$().css({
          'min-width': '75px',
          'width': '75px',
          'max-width': '75px'
        });
      });
      [1, 2, 6].forEach(i => {
        $(table.column(i).header()).css({
          'min-width': '150px',
          'width': '150px',
          'max-width': '150px'
        });
        table.column(i).nodes().to$().css({
          'min-width': '150px',
          'width': '150px',
          'max-width': '150px'
        });
      });
      $(table.column(7).header()).css({
        'min-width': '600px',
        'width': '600px',
        'max-width': '600px'
      });
      table.column(7).nodes().to$().css({
        'min-width': '600px',
        'width': '600px',
        'max-width': '600px'
      });

      $(document).off('change', '.check-vencimiento').on('change', '.check-vencimiento', (e: any) => {
        const checkbox = e.target;
        const row = $(checkbox).closest('tr');
        const data = table.row(row).data();

        if (!data) return;

        if (checkbox.checked) {
          const existe = this.lstSeleccionadosVencimientos.some(x => x.poliza === data.poliza);
          if (!existe) {
            this.lstSeleccionadosVencimientos.push(data);
          }
        } else {
          this.lstSeleccionadosVencimientos = this.lstSeleccionadosVencimientos.filter(x => x.poliza !== data.poliza);
        }
      });

      table.columns.adjust().draw();

    }, 100);

  }

  enviarNotificacionesSeleccionadas(): void {
    if (!this.lstSeleccionadosVencimientos || this.lstSeleccionadosVencimientos.length === 0) {
      this.toastrService.warning('Enviar notificaciones', 'Debe seleccionar al menos un registro.');
      return;
    }

    const registrosValidos = this.lstSeleccionadosVencimientos.filter(x => !!x.correo);

    if (registrosValidos.length === 0) {
      this.toastrService.warning('Enviar notificaciones', 'Los registros seleccionados no tienen correo.');
      return;
    }

    const payloads: IRegistroNotificacionesVencimientos[] = registrosValidos.map((registro) => ({
      email: registro.correo,
      nombreContactoPrincipal: registro.cliente,
      mes: this.obtenerNombreMesDesdeFecha(registro.fcHasta),
      cliente: registro.cliente,
      subarea: registro.subarea,
      nmRamo: registro.nmRamo,
      nmAseg: registro.nmAseg,
      poliza: registro.poliza,
      totValAsegFormat: this.formatoDinero(registro.totValAseg, true),
      vigenciaDesdeFormat: registro.fcDesde ? registro.fcDesde.split('T')[0] : '',
      vigenciaHastaFormat: registro.fcHasta ? registro.fcHasta.split('T')[0] : '',
      dscObjeto: registro.dscObjeto
    }));

    this.loadingService.showLoading();

    const solicitudes = payloads.map((payload) =>
      this.notificacionVencimientosService.enviarNotificacionUsuario(payload).pipe(
        catchError((error) =>
          of({
            esError: true,
            mensaje: 'Error al enviar la notificación.',
            resultado: {
              cliente: payload.cliente,
              poliza: payload.poliza,
              error
            }
          } as IResponse)
        )
      )
    );

    forkJoin(solicitudes)
      .pipe(
        finalize(() => this.loadingService.hideLoading())
      )
      .subscribe({
        next: (respuestas: IResponse[]) => {
          const exitosos = respuestas.filter(x => !x.esError);
          const fallidos = respuestas.filter(x => x.esError);

          if (exitosos.length > 0) {
            this.toastrService.success(
              'Enviar notificaciones',
              `Se enviaron ${exitosos.length} notificación(es) correctamente.`
            );
          }

          if (fallidos.length > 0) {
            this.toastrService.warning(
              'Enviar notificaciones',
              `No se pudieron enviar ${fallidos.length} notificación(es).`
            );
          }

          setTimeout(() => { window.location.reload(); }, 3000);

        },
        error: () => {
          this.toastrService.error(
            'Enviar notificaciones',
            'Ocurrió un error general al procesar las notificaciones.'
          );
        }
      });
  }

  obtenerNombreMesDesdeFecha(fecha: string | null | undefined): string {
    if (!fecha) return '';

    const f = new Date(fecha);

    if (isNaN(f.getTime())) return '';

    const mes = f.toLocaleDateString('es-EC', { month: 'long' });
    const anio = f.getFullYear();

    return `${mes} ${anio}`.toUpperCase();

  }

  GetSpanishLanguage() {
    return SpanishLanguage;
  }

  public formatoDinero(valor: number, esDinero: boolean): string {
    if (typeof valor == 'string') valor = Number(valor);
    if (valor) {
      const valorFormateado = valor.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return (esDinero ? '$' : '') + valorFormateado;
    } else {
      return (esDinero ? '$' : '') + '0.00';
    }
  }

}