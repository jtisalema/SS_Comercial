import { Component, ElementRef, ViewChild, NgZone, ChangeDetectorRef } from '@angular/core';
import { LoadingService } from 'src/app/services/loading.service';
import { PygService } from 'src/app/services/pyg.service';
import * as SpanishLanguage from 'src/assets/Spanish.json';
import { ToastrService } from 'src/app/services/toastr.service';
import { ActivatedRoute, Router } from '@angular/router';
declare var $: any;

@Component({
  selector: 'app-pygseguimiento',
  templateUrl: './pygseguimiento.component.html',
  styleUrls: ['./pygseguimiento.component.css']
})
export class PygseguimientoComponent {
  constructor(private pygService: PygService,
    private loadingService: LoadingService,
    private toastrService: ToastrService, private router: Router, private route: ActivatedRoute,
    private ngZone: NgZone, private cdr: ChangeDetectorRef
  ) {
  }

  @ViewChild('dataTableRegistros', { static: false }) tableRegistros!: ElementRef;
  @ViewChild('dataTableDetalle', { static: false }) tableDetalle!: ElementRef;
  lstRegistros: any[] = [];
  lstRegistrosDetalle: any[] = [];
  dtOptions: any;
  dataTable: any;
  dataTableDetalle: any;
  userCurrent: any;
  vistaActiva: 'clientes' | 'registros' = 'clientes';
  detalleConsultado = false;

  // Historial de auditoría del registro seleccionado.
  historialVisible = false;
  historialCargando = false;
  historialError = '';
  historialRegistro: any = null;
  movimientosHistorial: any[] = [];

  abrirHistorialRegistro(idRegistro: number): void {
    const registro = this.lstRegistrosDetalle.find((r: any) => Number(r.id) === Number(idRegistro));
    if (!registro) return;
    this.historialRegistro = registro;
    this.movimientosHistorial = [];
    this.historialError = '';
    this.historialCargando = true;
    this.historialVisible = true;
    this.cdr.detectChanges();

    // El endpoint debe estar incorporado en PygService. Si falta, el modal
    // permanece abierto y muestra el error en lugar de fallar silenciosamente.
    if (typeof (this.pygService as any).obtenerHistorialPYG !== 'function') {
      this.historialCargando = false;
      this.historialError = 'Falta implementar obtenerHistorialPYG en PygService.';
      this.cdr.detectChanges();
      return;
    }
    (this.pygService as any).obtenerHistorialPYG(idRegistro).subscribe({
      next: (res: any) => {
        this.historialCargando = false;
        if (res?.ok === false) {
          this.historialError = res?.mensaje || 'No se pudo obtener el historial.';
          this.cdr.detectChanges();
          return;
        }
        this.movimientosHistorial = Array.isArray(res?.data) ? res.data : [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.historialCargando = false;
        this.historialError = 'No se pudo consultar el historial del registro. Verifique el endpoint y su autorización.';
        this.cdr.detectChanges();
      }
    });
  }

  cerrarHistorialRegistro(): void {
    this.historialVisible = false;
    this.historialRegistro = null;
    this.movimientosHistorial = [];
  }


  ngOnInit(): void {
    (window as any).visualizarRegistro = this.visualizarRegistro.bind(this);
    this.vistaActiva = this.route.snapshot.queryParamMap.get('vista') === 'registros' ? 'registros' : 'clientes';
    this.consultarRegistrosPYG();
  }

  ngAfterViewInit(): void {
    // La tabla debe existir antes de inicializar DataTables.
    if (this.vistaActiva === 'registros') {
      this.mostrarVista('registros');
    }
  }

  mostrarVista(vista: 'clientes' | 'registros'): void {
    this.vistaActiva = vista;
    if (vista === 'registros' && !this.detalleConsultado) {
      this.consultarRegistrosPYGDetalle();
      return;
    }
    setTimeout(() => {
      const tabla = vista === 'clientes' ? this.dataTable : this.dataTableDetalle;
      if (tabla && $.fn.DataTable.isDataTable(tabla)) {
        tabla.DataTable().columns.adjust().draw(false);
      }
    }, 0);
  }

  consultarRegistrosPYG(): void {
    this.loadingService.showLoading();
    this.pygService.obtenerRegistrosPYG().subscribe((res: any) => {
      this.lstRegistros = Array.isArray(res.data) ? res.data : [];
      this.dtOptions = {
        data: this.lstRegistros,
        info: false,
        pageLength: 7,
        lengthChange: false,
        language: { ...this.GetSpanishLanguage() },
        columns: [
          {
            title: '<i class="fas fa-hashtag me-1"></i> N°',
            data: null,
            render: (data: any, type: any, row: any, meta: any) => meta.settings._iDisplayStart + meta.row + 1
          },
          {
            title: '<i class="fas fa-hashtag me-1"></i> Cliente',
            data: 'cliente',
            render: $.fn.dataTable.render.text()
          },
          {
            title: '<i class="fas fa-cogs me-1"></i> Revisar',
            data: null,
            searchable: false,
            orderable: false,
            render: (data: any, type: any, full: any) =>
              `<div class="d-flex justify-content-center flex-nowrap" style="gap:5px"><button title="Visualizar" class="btn btn-info btn-sm btn-ver-pyg" data-id="${Number(full.id)}"><i class="fas fa-search"></i></button></div>`
          }
        ],
        order: [[0, 'desc']],
        responsive: false,
        autoWidth: false,
        scrollX: true
      };
      this.dataTable = $(this.tableRegistros.nativeElement);
      if ($.fn.DataTable.isDataTable(this.dataTable)) this.dataTable.DataTable().destroy();
      this.dataTable.DataTable(this.dtOptions);
      this.dataTable.off('click.pyg').on('click.pyg', '.btn-ver-pyg', (event: any) => {
        this.visualizarRegistro(Number($(event.currentTarget).attr('data-id')));
      });
      this.loadingService.hideLoading();
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener los registros por cliente!');
    });
  }

  // Cada campo del grupo puede incluir varios valores separados por punto y coma.
  // Mostrar solo los distintos, respetando el orden en que llegaron.
  private valoresUnicosSeguimiento(valor: any): string {
    if (valor === null || valor === undefined) return '';
    const vistos = new Set<string>();
    return String(valor).split(';').map((parte: string) => parte.trim())
      .filter((parte: string) => {
        if (!parte) return false;
        const clave = parte.replace(/\s+/g, ' ').toLocaleLowerCase();
        if (vistos.has(clave)) return false;
        vistos.add(clave);
        return true;
      }).join('; ');
  }

  consultarRegistrosPYGDetalle(): void {
    this.loadingService.showLoading();
    this.pygService.obtenerRegistrosPYGDetalle().subscribe((res: any) => {
      this.lstRegistrosDetalle = (Array.isArray(res.data) ? res.data : []).map((registro: any) => ({
        ...registro,
        aseguradorasTexto: this.valoresUnicosSeguimiento(registro.aseguradorasTexto),
        polizasTexto: this.valoresUnicosSeguimiento(registro.polizasTexto),
        vigenciasTexto: this.valoresUnicosSeguimiento(registro.vigenciasTexto)
      }));
      const texto = (data: any, type: any) => {
        if (type !== 'display') return data == null ? '' : String(data);
        return $('<div>').text(data == null ? '' : String(data)).html();
      };
      const opciones = {
        data: this.lstRegistrosDetalle,
        info: false,
        pageLength: 7,
        lengthChange: false,
        language: { ...this.GetSpanishLanguage() },
        columns: [
          {
            title: 'N°',
            data: null,
            render: (data: any, type: any, row: any, meta: any) =>
              type === 'display' ? meta.settings._iDisplayStart + meta.row + 1 : Number(row.id)
          },
          {
            title: 'Estado',
            data: 'estado',
            render: (data: any, type: any, row: any) => {
              if (type !== 'display') return Number(data);
              if (Number(data) === 1) return '<span class="pyg-estado pyg-estado-pendiente"><i class="fas fa-clock"></i> Pendiente Aprobación</span>';
              if (Number(data) === 2) return '<span class="pyg-estado pyg-estado-observaciones"><i class="fas fa-comment-dots"></i> Observaciones enviadas</span>';
              if (Number(data) === 4) return '<span class="pyg-estado pyg-estado-aprobado"><i class="fas fa-check-circle"></i> Aprobado</span>';
              if (Number(data) === 6) return '<span class="pyg-estado pyg-estado-rechazado"><i class="fas fa-times-circle"></i> Rechazado</span>';
              return texto(data, type);
            }
          },
                    { title: 'Seguimiento', data: null, searchable: false, orderable: false,
            className: 'text-center',
            render: (data: any, type: any, row: any) =>
              type === 'display'
                ? `<button type="button" class="pyg-btn-historial" data-id="${Number(row.id)}" title="Seguimiento" aria-label="Seguimiento del registro ${Number(row.id)}"><i class="fas fa-history" aria-hidden="true"></i></button>`
                : '' },
          { title: 'Fecha ult. Act.', data: 'fechaUltimaActualizacion', defaultContent: '', render: texto },
          { title: 'Cliente', data: 'cliente', render: texto },
          { title: 'Registro', data: 'nombreRegistro', defaultContent: '', render: texto },
          { title: 'Ramos', data: 'ramosTexto', defaultContent: '', render: texto },
          { title: 'Aseguradoras', data: 'aseguradorasTexto', defaultContent: '', render: texto },
          { title: 'Pólizas', data: 'polizasTexto', defaultContent: '', render: texto },
          { title: 'Vigencias', data: 'vigenciasTexto', defaultContent: '', render: texto },
          { title: 'Usuario', data: 'nombreUsuario', defaultContent: '', render: texto },
          { title: 'Revisar', data: null, searchable: false, orderable: false,
            render: (data: any, type: any, full: any) =>
              `<button title="Visualizar registro" class="btn btn-info btn-sm btn-ver-detalle-pyg" data-id="${Number(full.id)}"><i class="fas fa-search"></i></button>` }
        ],
        // Prioridad: 1 (pendiente), 2 (corrección), 4 (aprobado), 6 (rechazado).
        // Dentro de cada estado, mostrar primero la última actualización.
        order: [[1, 'asc'], [3, 'desc']],
        createdRow: (row: any, data: any) => {
          // DataTables crea las filas fuera del compilador de plantillas Angular.
          if (Number(data.estado) === 1) {
            $(row).addClass('pyg-registro-pendiente');
          }
        },
        rowCallback: (row: any, data: any) => {
          // Se reaplica tras ordenar, buscar o paginar.
          $(row).toggleClass('pyg-registro-pendiente', Number(data.estado) === 1);
        },
        responsive: false,
        autoWidth: false,
        scrollX: true
      };
      this.dataTableDetalle = $(this.tableDetalle.nativeElement);
      if ($.fn.DataTable.isDataTable(this.dataTableDetalle)) this.dataTableDetalle.DataTable().destroy();
      this.dataTableDetalle.DataTable(opciones);
      this.dataTableDetalle.off('click.pyg').on('click.pyg', '.btn-ver-detalle-pyg', (event: any) => {
        this.visualizarRegistroIndividual(Number($(event.currentTarget).attr('data-id')));
      });
      this.dataTableDetalle.off('click.pygHistorial').on('click.pygHistorial', '.pyg-btn-historial', (event: any) => {
        event.preventDefault();
        event.stopPropagation();
        const idRegistro = Number($(event.currentTarget).attr('data-id'));
        this.ngZone.run(() => this.abrirHistorialRegistro(idRegistro));
      });
      this.detalleConsultado = true;
      setTimeout(() => this.dataTableDetalle.DataTable().columns.adjust().draw(false), 0);
      this.loadingService.hideLoading();
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener el detalle de registros PYG!');
    });
  }

  visualizarRegistro(item: any): void {
    this.router.navigate(['/home/pyg/ingreso2', item]);
  }
  visualizarRegistroIndividual(item: any): void {
    this.router.navigate(['/home/pyg/ingreso2', item, 1]);
  }
  GetSpanishLanguage() {
    return SpanishLanguage;
  }
}
