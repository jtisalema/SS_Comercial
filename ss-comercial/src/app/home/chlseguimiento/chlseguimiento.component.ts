import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { ChecklistService } from 'src/app/services/checklist.service';
import { LoadingService } from 'src/app/services/loading.service';
import * as SpanishLanguage from 'src/assets/Spanish.json';
import { ToastrService } from 'src/app/services/toastr.service';
declare var $: any;
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
@Component({
  selector: 'app-chlseguimiento',
  templateUrl: './chlseguimiento.component.html',
  styleUrls: ['./chlseguimiento.component.css']
})
export class ChlseguimientoComponent {
  @ViewChild('dataTableIngresos', { static: false }) tableIngresos!: ElementRef;
  lstIngresos: any = [];
  dtOptions: any;
  dataTable: any;
  userCurrent: any;
  esEjecutivo: boolean = false;
  idEjecutivo: any;
  constructor(private checklistService: ChecklistService, private loadingService: LoadingService,
    private toastrService: ToastrService, private router: Router, private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {

  }
  async ngOnInit() {
    this.userCurrent = await this.authService.getUserInfor();
    if (this.userCurrent.idRol == 29) {
      this.idEjecutivo = this.userCurrent.id;
      this.esEjecutivo = true;
    }
    (window as any).revisarIngreso = this.revisarIngreso.bind(this);
    (window as any).estimarEntrega = this.estimarEntrega.bind(this);
    (window as any).abrirModalHistorialMovimientos = this.abrirModalHistorialMovimientos.bind(this);

    this.consultarIngresos();
  }
  consultarIngresos() {
    this.loadingService.showLoading();
    this.checklistService.obtenerIngresosCheckList().subscribe((res: any) => {
      this.lstIngresos = res.data;
      //Filtro personalizado
      $.fn.dataTable.ext.search.push(
        (settings: any, data: any, dataIndex: any) => {

          // 🔹 Solo aplicar si esEjecutivo es verdadero
          if (!this.esEjecutivo) return true;

          const checked = ($('#chkEstadoFiltro') as any).prop('checked');

          if (!checked) return true;

          const rowData = settings.aoData[dataIndex]._aData;
          const estado = Number(rowData.idEjecutivo);

          return [this.idEjecutivo].includes(estado);
        }
      );
      const self = this;

      this.dtOptions = {
        data: this.lstIngresos,
        info: false,
        pageLength: 7,
        lengthChange: false,
        language: {
          ...this.GetSpanishLanguage()
        },

        // ✅ Checkbox al lado del buscador
        initComplete: function () {
          if (!self.esEjecutivo) return;

          const api = this.api();

          const checkbox = `
      <div class="form-check form-check-inline me-3" style="margin-bottom:0;">
        <input 
          class="form-check-input" 
          type="checkbox" 
          id="chkEstadoFiltro" 
          checked
          style="margin-top:0; cursor:pointer;"
        >
        <label 
          class="form-check-label ms-2" 
          for="chkEstadoFiltro"
          style="cursor:pointer; margin-bottom:0;font-weight:bold"
        >
          Mis asignaciones
        </label>
      </div>
    `;

          $('.dataTables_filter').prepend(checkbox);

          $('#chkEstadoFiltro').on('change', function () {
            api.draw();
          });

          setTimeout(() => {
            api.draw();
          }, 0);
        },

        columns: [

          // N°
          {
            title: '<i class="fas fa-hashtag me-1"></i> N°',
            data: 'id'
          },

          // Prioridad
          {
            title: '<i class="fas fa-exclamation-circle me-1 text-danger"></i> Prioridad',
            data: 'prioridad',
            className: 'text-center',
            render: function (data: string) {

              let clase = 'badge bg-secondary';

              if (data === 'ALTA') {
                clase = 'badge bg-danger';
              } else if (data === 'MEDIA') {
                clase = 'badge bg-warning';
              } else if (data === 'BAJA') {
                clase = 'badge bg-success';
              }

              return `<span class="${clase} px-2 py-1" style="font-size:10px">${data}</span>`;
            }
          },

          // Opciones
          {
            title: '<i class="fas fa-cogs me-1"></i> Opción',
            searchable: false,
            render: (data: any, type: any, full: any, meta: any) => {

              let botones = '';

              if ((full.idEstado == 1 || full.idEstado == 2) && this.esEjecutivo) {
                botones += `
        <button title="Revisar" type="button"
          class="btn btn-primary btn-sm"
          onclick="revisarIngreso(${full.id})">
          <i class="fas fa-edit"></i>
        </button>
      `;
              }

              if (full.idEstado == 3 && !this.esEjecutivo) {
                botones += `
        <button title="Revisar" type="button"
          class="btn btn-primary btn-sm"
          onclick="revisarIngreso(${full.id})">
          <i class="fas fa-edit"></i>
        </button>
      `;
              }

              botones += `
      <button title="Seguimiento" type="button"
        class="btn btn-success btn-sm"
        onclick="abrirModalHistorialMovimientos(${full.id})">
        <i class="fas fa-search"></i>
      </button>
    `;

              if (full.idEstado == 1 && !this.esEjecutivo) {
                botones += `
        <button title="Corregir" type="button"
          class="btn btn-warning btn-sm"
          onclick="revisarIngreso(${full.id})">
          <i class="fas fa-edit"></i>
        </button>
      `;
              }

              if (full.idEstado == 2 && this.esEjecutivo) {
                botones += `
        <button title="Estimar" type="button"
          class="btn btn-info btn-sm"
          onclick="estimarEntrega(${full.id})">
          <i class="fas fa-flag"></i>
        </button>
      `;
              }

              // Flex container centrado con espacio entre botones
              return `<div class="d-flex justify-content-center flex-nowrap" style="gap: 5px;">${botones}</div>`;
            }
          },

          // Estado
          {
            title: '<i class="fas fa-info-circle me-1"></i> Estado',
            data: 'estado',
            render: function (data: any) {
              return `<strong>${data}</strong>`;
            }
          },

          // Fecha Registro
          {
            title: '<i class="fas fa-calendar-alt me-1"></i> F. Registro',
            data: 'fechaRegistro'
          },

          // Fecha Entrega
          {
            title: '<i class="fas fa-clock me-1"></i> F. Entrega',
            data: 'fechaMaxima',
            render: function (data: any, type: any, row: any) {
              const estado = Number(row.idEstado);
              if ([2, 4].includes(estado)) {
                return data ?? '';
              }
              return '-';
            }
          },

          // Cliente
          {
            title: '<i class="fas fa-user me-1"></i> Cliente',
            data: 'cliente'
          },

          // Ramos
          {
            title: '<i class="fas fa-layer-group me-1"></i> Ramos',
            data: 'lstRamos'
          },

          // Aseguradora
          {
            title: '<i class="fas fa-building me-1"></i> Aseguradora',
            data: 'aseguradora'
          },

          // Solicitante
          {
            title: '<i class="fas fa-user-tie me-1"></i> Solicitante',
            data: 'solicitante'
          },

          // Ejecutivo
          {
            title: '<i class="fas fa-briefcase me-1"></i> Ejecutivo',
            data: 'ejecutivo'
          }

        ],

        order: [[0, 'desc']],
        responsive: false,
        autoWidth: false,
        scrollX: true,
      };
      this.dataTable = $(this.tableIngresos.nativeElement);
      this.dataTable.DataTable(this.dtOptions);
      this.loadingService.hideLoading();
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener los registros!');
    });
  }
  GetSpanishLanguage() {
    return SpanishLanguage;
  }
  revisarIngreso(idIngreso: any) {
    let formd = new FormData();
    formd.append('idEjecutivo', this.userCurrent.id);
    formd.append('idIngreso', idIngreso);
    if (this.esEjecutivo) {
      this.checklistService.cambiarEstadoRevisado(formd).subscribe((res: any) => {
        this.router.navigate(['/home/checkList/ingreso', res.data]);
      }, (error: any) => {
        this.toastrService.error('ERROR', 'Error al actualizar el estado!');
      });
    } else {
      this.router.navigate(['/home/checkList/ingreso', idIngreso]);
    }
  }
  registroSeleccionado: any = '';
  tiempoOcupado: any = '';
  fechaEstimada: any = '';
  lstMovimientosRegistro: any = [];
  abrirModalHistorialMovimientos(idRegistro: any) {
    this.registroSeleccionado = idRegistro;
    this.lstMovimientosRegistro = [];
    this.checklistService.obtenerMovimientosRegistro(idRegistro).subscribe((res: any) => {
      this.lstMovimientosRegistro = res.data;
      this.fechaEstimada = res.fechaEstimada;
      this.tiempoOcupado = res.tiempoOcupado;
      $('#contactoModal').modal('show');
      this.cdr.detectChanges();
    }, (error: any) => {
      this.loadingService.hideLoading();
      this.toastrService.error('ERROR', 'No se pudo obtener los movimientos!');
    });

  }
  estimarEntrega(idIngreso: any) {
    Swal.fire({
      title: 'Fecha estimada para la entrega',
      html: `
    <div class="d-flex flex-column gap-3 align-items-center justify-content-center" style="text-align:center;">
      <input type="datetime-local" id="fechaEntrega" class="form-control" style="width:80%;text-align:center" placeholder="Selecciona fecha y hora">

      <label for="observacion" class="form-label fw-bold">Observaciones / Razón de la entrega</label>
      <textarea id="observacion" class="form-control" style="width:80%; resize:none;text-align:center" placeholder="Ingresa una observación"></textarea>
    </div>
  `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      allowOutsideClick: false, // ❌ no cerrar al click fuera
      preConfirm: () => {
        const popup = Swal.getPopup();
        if (!popup) {
          Swal.showValidationMessage('Error: no se encontró el popup');
          return false;
        }

        const fechaInput = popup.querySelector<HTMLInputElement>('#fechaEntrega');
        const obsInput = popup.querySelector<HTMLTextAreaElement>('#observacion');

        if (!fechaInput || !obsInput) {
          Swal.showValidationMessage('Error al obtener los campos');
          return false;
        }

        const fecha = fechaInput.value;
        const obs = obsInput.value;

        if (!fecha || !obs) {
          Swal.showValidationMessage('Ambos campos son obligatorios');
          return false;
        }

        return { fecha, observacion: obs };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.openDialogEnviar();
        let formD = new FormData();
        formD.append('idIngreso', idIngreso);
        formD.append('fechaEstimada', result.value.fecha);
        formD.append('idEjecutivo', this.userCurrent.id);
        formD.append('observacion', result.value.observacion);

        this.checklistService.ingresarEntregaEstimada(formD).subscribe((res: any) => {
          this.closeDialog();
          Swal.fire({
            icon: 'success',
            title: '¡Éxito!',
            text: 'Fecha de Entrega Ingresada Correctamente',
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            allowEscapeKey: false,
            allowEnterKey: true,
            showCloseButton: false
          }).then((result) => {
            if (result.isConfirmed) {
              window.location.reload();
            }
          });
        }, (error: any) => {
          this.closeDialog();
          this.toastrService.error('ERROR', 'No se pudo guardar el movimiento!');
        });
      }
    });
  }
  openDialogEnviar() {
    Swal.fire({
      title: 'Espere!',
      text: 'Enviando...',
      imageWidth: 400,
      imageHeight: 250,
      imageUrl: 'assets/images/enviando.gif',
      timerProgressBar: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false
    });
    Swal.showLoading();
  }

  closeDialog() {
    Swal.hideLoading();
    Swal.close();
  }
}
