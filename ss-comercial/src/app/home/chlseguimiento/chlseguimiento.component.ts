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
  esComercial: boolean = false;
  idComercial: any;
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
    if (this.userCurrent.idRol == 18) {
      this.idComercial = this.userCurrent.id;
      this.esComercial = true;
    }
    (window as any).revisarIngreso = this.revisarIngreso.bind(this);
    (window as any).estimarEntrega = this.estimarEntrega.bind(this);
    (window as any).visualizarIngreso = this.visualizarIngreso.bind(this);
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
          //if (!this.esEjecutivo) return true;

          const checked = ($('#chkEstadoFiltro') as any).prop('checked');

          if (!checked) return true;

          const rowData = settings.aoData[dataIndex]._aData;
          if (this.esEjecutivo) {
            const estado = Number(rowData.idEjecutivo);
            return [this.idEjecutivo].includes(estado);
          } else if (this.esComercial) {
            const estado = Number(rowData.idComercial);
            return [this.idComercial].includes(estado);
          } else {
            return true;
          }

        }
      );
const self = this;

// 🔥 FILTRO GLOBAL (ROJO / AMARILLO)
$.fn.dataTable.ext.search.push((settings: any, data: any, dataIndex: any) => {

  const row = settings.aoData[dataIndex]._aData;

  const chkRojo = ($('#chkRojo') as any).prop('checked');
  const chkAmarillo = ($('#chkAmarillo') as any).prop('checked');

  if (!chkRojo && !chkAmarillo) return true;

  if (!row.fechaMaxima) return true;

  const hoy = new Date();
  const fechaMaxima = new Date((row.fechaMaxima + '').replace(' ', 'T'));

  hoy.setHours(0, 0, 0, 0);
  fechaMaxima.setHours(0, 0, 0, 0);

  const estado = Number(row.idEstado);

  const esRojo = (hoy >= fechaMaxima && estado === 2);
  const esAmarillo = (hoy >= fechaMaxima && (estado === 4 || estado === 9));

  if (chkRojo && !chkAmarillo) return esRojo;
  if (chkAmarillo && !chkRojo) return esAmarillo;
  if (chkRojo && chkAmarillo) return esRojo || esAmarillo;

  return true;
});

this.dtOptions = {
  data: this.lstIngresos,
  info: false,
  pageLength: 7,
  lengthChange: false,
  language: {
    ...this.GetSpanishLanguage()
  },

  // 🔥 PINTADO DE FILAS
  rowCallback: function (row: any, data: any) {

    $(row).find('td').css('background-color', '');

    if (!data.fechaMaxima) return;

    const hoy = new Date();
    const fechaMaxima = new Date((data.fechaMaxima + '').replace(' ', 'T'));

    hoy.setHours(0, 0, 0, 0);
    fechaMaxima.setHours(0, 0, 0, 0);

    const estado = Number(data.idEstado);

    if (hoy >= fechaMaxima) {

      if (estado === 2) {
        $(row).find('td').css('background-color', '#f8d7da'); // 🔴
      } else if (estado == 4 || estado == 9) {
        $(row).find('td').css('background-color', '#fff9b2'); // 🟡
      }
    }
  },

  // 🔥 UI CONTROLES
initComplete: function () {

    let mensaje = 'Mis Registros';
    if (self.esEjecutivo) {
        mensaje = 'Mis Asignaciones';
    }

    const api = this.api();

    setTimeout(() => {

        const checkbox = `
        <div id="filtrosExtras" class="d-flex flex-wrap align-items-center gap-3">

            <div class="d-flex align-items-center">
                <input type="checkbox" id="chkEstadoFiltro" class="me-1" checked>
                <label class="mb-0" for="chkEstadoFiltro">
                    ${mensaje}
                </label>
            </div>

            <div class="d-flex align-items-center">
                <input type="checkbox" id="chkRojo" class="me-1">
                <label class="mb-0 text-danger" for="chkRojo">
                    ● Atrasado
                </label>
            </div>

            <div class="d-flex align-items-center">
                <input type="checkbox" id="chkAmarillo" class="me-1">
                <label class="mb-0 text-warning" for="chkAmarillo">
                    ● Pendiente
                </label>
            </div>

        </div>
        `;

        const filter = $(api.table().container()).find('.dataTables_filter');

        // Crear barra superior si no existe
        if (!$('#toolbarFiltros').length) {

            filter.before(`
                <div id="toolbarFiltros"
                     style="
                       display:flex;
                       justify-content:space-between;
                       align-items:center;
                       flex-wrap:wrap;
                       gap:12px;
                       margin-bottom:10px;
                     ">
                </div>
            `);

            $('#toolbarFiltros').append(checkbox);

            // mover buscador dentro de la barra
            $('#toolbarFiltros').append(filter);
        }

        // evita que el buscador se expanda raro
        filter.css({
            margin: 0,
            whiteSpace: 'nowrap'
        });

        const drawTable = () => api.draw();

        $('#chkEstadoFiltro').on('change', drawTable);
        $('#chkRojo').on('change', drawTable);
        $('#chkAmarillo').on('change', drawTable);

        api.draw();

    },0);
},

  columns: [

    // 🔥 ORDEN (prioridad interna)
    {
      data: null,
      visible: false,
      render: function (data: any, type: any, row: any) {

        if (type === 'sort') {

          if (!row.fechaMaxima) return 0;

          const hoy = new Date();
          const fechaMaxima = new Date((row.fechaMaxima + '').replace(' ', 'T'));

          hoy.setHours(0, 0, 0, 0);
          fechaMaxima.setHours(0, 0, 0, 0);

          const estado = Number(row.idEstado);

          if (hoy >= fechaMaxima && estado === 2) return 1;

          return 0;
        }

        return '';
      }
    },

    { title: 'N°', data: 'id' },

    {
      title: 'Prioridad / Gestión',
      data: null,
      render: function (data: any, type: any, row: any) {

        let icono = '';
        let color = '';

        switch (row.prioridad) {
          case 'ALTA': icono = '↑'; color = 'red'; break;
          case 'MEDIA': icono = '='; color = 'orange'; break;
          case 'BAJA': icono = '↓'; color = 'green'; break;
          default: icono = '?';
        }

let tipo = row.tipoGestion == 1
    ? 'Emisión Póliza nueva'
    : row.tipoGestion == 2
        ? 'Ingreso Póliza nueva'
        : row.tipoGestion == 3
            ? 'Renovación de póliza'
            : 'Sin definir';
        return `
          <div style="font-size:11px">
            <div style="color:${color}">
              ${icono} <strong>${row.prioridad}</strong>
            </div>
            <div>${tipo}</div>
          </div>
        `;
      }
    },

    {
      title: '<i class="fas fa-cogs me-1"></i> Opción',
      searchable: false,
      render: (data: any, type: any, full: any) => {

        let botones = '';

        if ((full.idEstado == 1 || full.idEstado == 2 || full.idEstado == 4|| full.idEstado == 9) && this.esEjecutivo) {
          botones += `<button title="Revisar" class="btn btn-primary btn-sm" onclick="revisarIngreso(${full.id})"><i class="fas fa-edit"></i></button>`;
        }

        if (full.idEstado == 3 && !this.esEjecutivo) {
          botones += `<button title="Revisar" class="btn btn-primary btn-sm" onclick="revisarIngreso(${full.id})"><i class="fas fa-edit"></i></button>`;
        }

        botones += `<button title="Seguimiento" class="btn btn-success btn-sm" onclick="abrirModalHistorialMovimientos(${full.id})"><i class="fas fa-search"></i></button>`;

        if (full.idEstado == 1 && !this.esEjecutivo) {
          botones += `<button title="Revisar" class="btn btn-warning btn-sm" onclick="revisarIngreso(${full.id})"><i class="fas fa-edit"></i></button>`;
        }

        if (full.idEstado == 2 && this.esEjecutivo) {
          botones += `<button title="Estimar Entrega" class="btn btn-info btn-sm" onclick="estimarEntrega(${full.id})"><i class="fas fa-flag"></i></button>`;
        }

        botones += `<button title="Visualizar" class="btn btn-info btn-sm" onclick="visualizarIngreso(${full.id})"><i class="fas fa-eye"></i></button>`;

        return `<div class="d-flex justify-content-center flex-nowrap" style="gap:5px">${botones}</div>`;
      }
    },

    { title: 'Estado', data: 'estado' },
    { title: 'F. Registro', data: 'fechaRegistro' },
    { title: 'F. Ingreso', data: 'fechaMaxima' },
    { title: 'Cliente', data: 'cliente' },
    { title: 'Ramos', data: 'lstRamos' },
    { title: 'Aseguradora', data: 'aseguradora' },
    { title: 'Solicitante', data: 'solicitante' },
    { title: 'Ejecutivo', data: 'ejecutivo' }

  ],

  order: [
    [0, 'desc'],
    [1, 'desc']
  ],

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
  visualizarIngreso(idIngreso: any) {
    let visualizar = 1;
    this.router.navigate(['/home/checkList/ingreso', idIngreso, visualizar]);
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
